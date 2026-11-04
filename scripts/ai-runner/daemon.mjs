import fs from 'node:fs';
import path from 'node:path';
import { TrelloClient } from './trello.mjs';
import { GitWorktreeManager } from './git-worktree.mjs';
import { runClaudeAgent } from './executors/claude-executor.mjs';
import { runGeminiAgent } from './executors/gemini-executor.mjs';

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 30);
}

class AIRunnerDaemon {
  constructor(options = {}) {
    this.pollIntervalMs = options.pollIntervalMs || 20000;
    this.runOnce = options.runOnce || false;
    this.stateFile = path.resolve(process.cwd(), '.ai-runner-state.json');
    this.trello = new TrelloClient();
    this.git = new GitWorktreeManager();
    this.state = this.loadState();
    this.isProcessing = false;
  }

  loadState() {
    if (fs.existsSync(this.stateFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      } catch {
        return { processedCards: {} };
      }
    }
    return { processedCards: {} };
  }

  saveState() {
    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  async discoverBoardMap() {
    const lists = await this.trello.getLists();
    const map = {
      modelLists: {}, // name -> listId
      reviewListId: null,
      backlogListId: null,
      doneListId: null,
    };

    const targetModels = ['opus', 'sonet', 'haiku', 'flash', 'argon'];

    for (const list of lists) {
      const name = list.name.trim().toLowerCase();
      if (targetModels.includes(name)) {
        map.modelLists[name] = list.id;
      } else if (name.includes('revision') || name.includes('revisión')) {
        map.reviewListId = list.id;
      } else if (name.includes('backlog')) {
        map.backlogListId = list.id;
      } else if (name.includes('finalizada') || name.includes('done')) {
        map.doneListId = list.id;
      }
    }

    console.log('\n📋 Mapeo de columnas de Trello detectado:');
    console.log('----------------------------------------------------');
    for (const [model, listId] of Object.entries(map.modelLists)) {
      console.log(`  🤖 Modelo [${model}] -> Columna ID: ${listId}`);
    }
    console.log(`  👀 Revisión -> Columna ID: ${map.reviewListId || 'No encontrada'}`);
    console.log(`  📦 Backlog -> Columna ID: ${map.backlogListId || 'No encontrada'}`);
    console.log('----------------------------------------------------\n');

    return map;
  }

  async processCard(card, model, boardMap) {
    const cardShortId = card.idShort || card.id.slice(-6);
    const branchName = `ai/${model}/hu-${cardShortId}-${slugify(card.name)}`;
    console.log(`\n======================================================`);
    console.log(`🎯 TAREA DETECTADA PARA [${model.toUpperCase()}]: "${card.name}"`);
    console.log(`🏷️ Tarjeta ID: ${card.id} | Rama: ${branchName}`);
    console.log(`======================================================\n`);

    // Comentar en Trello que el agente empieza a trabajar
    try {
      await this.trello.addComment(
        card.id,
        `🤖 El agente **${model.toUpperCase()}** ha iniciado el desarrollo autónomo.\n🌿 Rama asignada: \`${branchName}\``
      );
    } catch (e) {
      console.warn(`No se pudo enviar comentario inicial a Trello: ${e.message}`);
    }

    // 1. Crear entorno aislado con Git Worktree
    let worktreePath = null;
    try {
      worktreePath = this.git.createWorktree(branchName);

      // Preparar el prompt completo con la Historia de Usuario
      const prompt = `HISTORIA DE USUARIO: ${card.name}
DESCRIPCIÓN Y REQUISITOS:
${card.desc || 'Sin descripción adicional. Analiza el título e implementa la solución siguiendo las mejores prácticas del repositorio.'}

REGLAS DE TRABAJO:
1. Analiza el código actual en este repositorio antes de hacer cambios.
2. Escribe código TypeScript/React limpio, sin romper el build.
3. Asegúrate de que npm run build o tests compilen sin errores antes de finalizar.
4. Trabaja de forma 100% autónoma.
5. OBLIGATORIO: Cuando termines de implementar y verificar el código, crea un archivo llamado "AI_SUMMARY.md" en la raíz del proyecto explicando detalladamente:
   - Qué cambios y soluciones has implementado.
   - Qué archivos modificaste o creaste y por qué.
   - Cómo puede el usuario probar o revisar tu solución.`;

      // 2. Ejecutar el agente correspondiente
      let result = null;
      if (['opus', 'sonet', 'haiku'].includes(model)) {
        result = await runClaudeAgent({ model, prompt, worktreePath });
      } else {
        result = await runGeminiAgent({ model, prompt, worktreePath });
      }

      if (!result.success) {
        console.warn(`❌ El agente ${model} no pudo completar la tarea.`);
        await this.trello.addComment(
          card.id,
          `⚠️ **${model.toUpperCase()}** no pudo completar la tarea (código de salida con error).\n` +
          `Si usas Claude, asegúrate de haber ejecutado \`npx @anthropic-ai/claude-code\` una vez para iniciar sesión con tu cuenta de Claude Pro.`
        );
        return;
      }

      // Leer el archivo de resumen AI_SUMMARY.md si el agente lo generó
      const summaryFilePath = path.resolve(worktreePath, 'AI_SUMMARY.md');
      let aiExplanation = '';
      if (fs.existsSync(summaryFilePath)) {
        aiExplanation = fs.readFileSync(summaryFilePath, 'utf8').trim();
        // Borramos el archivo temporal antes del commit para no ensuciar el repo
        try { fs.unlinkSync(summaryFilePath); } catch {}
      }

      // 3. Comprobar si hubo cambios y hacer commit & push
      const hasChanges = this.git.hasChanges(worktreePath);
      const changedFiles = this.git.getChangedFilesList(worktreePath);
      let pushed = false;

      if (hasChanges) {
        const commitMsg = `feat(ai-${model}): ${card.name}\n\nResuelve tarjeta Trello: ${card.url || card.name}`;
        pushed = this.git.commitAndPush(worktreePath, branchName, commitMsg);
      } else {
        console.log(`ℹ️ No se detectaron cambios en el código para la tarea.`);
      }

      // 4. Mover la tarjeta a "En revisión"
      if (boardMap.reviewListId) {
        console.log(`📦 Moviendo tarjeta a la columna "En revisión"...`);
        await this.trello.moveCard(card.id, boardMap.reviewListId);
      }

      // 5. Añadir comentario final detallado con el informe completo
      let commentMsg = `🎉 **${model.toUpperCase()} ha completado la tarea**\n\n` +
        `🌿 **Rama de trabajo:** \`${branchName}\`\n\n`;

      if (aiExplanation) {
        commentMsg += `### 📋 Explicación de los cambios:\n${aiExplanation}\n\n`;
      } else if (result.summary) {
        commentMsg += `### 📋 Resumen:\n${result.summary}\n\n`;
      }

      if (changedFiles) {
        commentMsg += `### 📁 Archivos modificados:\n\`\`\`\n${changedFiles}\n\`\`\`\n\n`;
      }

      if (pushed) {
        commentMsg += `🚀 **Estado:** Rama subida a GitHub. Ya puedes revisarla y fusionarla cuando desees.\n`;
      } else if (!hasChanges) {
        commentMsg += `ℹ️ **Nota:** El agente revisó los requisitos pero no requirió cambios en código.\n`;
      }

      await this.trello.addComment(card.id, commentMsg);

      // Registrar en el estado local
      this.state.processedCards[card.id] = {
        title: card.name,
        model,
        branchName,
        completedAt: new Date().toISOString(),
      };
      this.saveState();
    } catch (err) {
      console.error(`❌ Error procesando tarjeta ${card.name}:`, err);
      try {
        await this.trello.addComment(card.id, `⚠️ Error en la ejecución autónoma de ${model}: ${err.message}`);
      } catch {}
    } finally {
      // 6. Limpieza segura del worktree
      if (worktreePath) {
        this.git.removeWorktree(worktreePath, branchName);
      }
    }
  }

  async tick(boardMap) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      for (const [model, listId] of Object.entries(boardMap.modelLists)) {
        const cards = await this.trello.getCardsInList(listId);
        for (const card of cards) {
          // Si ya fue procesada, la omitimos
          if (this.state.processedCards[card.id]) {
            continue;
          }
          await this.processCard(card, model, boardMap);
        }
      }
    } catch (err) {
      console.error('Error en el ciclo del daemon:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  async start() {
    console.log('🚀 Iniciando AI Runner Daemon (Trello -> Multi-Agent Swarm)...');
    const boardMap = await this.discoverBoardMap();

    if (this.runOnce) {
      console.log('🔍 Ejecutando comprobación única (--once)...');
      await this.tick(boardMap);
      console.log('🏁 Comprobación completada.');
      return;
    }

    console.log(`⏱️ Vigilando tablero cada ${this.pollIntervalMs / 1000}s. Presiona Ctrl+C para detener.\n`);
    await this.tick(boardMap);

    setInterval(async () => {
      await this.tick(boardMap);
    }, this.pollIntervalMs);
  }
}

// Ejecución directa si se invoca desde CLI
const isOnce = process.argv.includes('--once');
const daemon = new AIRunnerDaemon({ runOnce: isOnce });
daemon.start().catch((err) => {
  console.error('Fallo fatal al iniciar el daemon:', err);
  process.exit(1);
});
