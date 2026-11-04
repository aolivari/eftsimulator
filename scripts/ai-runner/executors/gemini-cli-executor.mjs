import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEnv } from '../config.mjs';

function resolveAntigravityBin() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const candidate = path.join(localAppData, 'Programs', 'antigravity', 'resources', 'bin', 'language_server.exe');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  const batCandidate = path.join(os.homedir(), '.gemini', 'antigravity', 'bin', 'agentapi.bat');
  if (fs.existsSync(batCandidate)) {
    return batCandidate;
  }
  throw new Error(`No se encontró el binario local de Antigravity en ${candidate}`);
}

function isProcessAlive(pid) {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function resolveAntigravityDaemonEnv() {
  // Si ya vienen en el entorno, las respetamos
  if (process.env.ANTIGRAVITY_LS_ADDRESS && process.env.ANTIGRAVITY_CSRF_TOKEN) {
    return {
      ...process.env,
    };
  }

  const daemonDir = path.join(os.homedir(), '.gemini', 'antigravity', 'daemon');
  if (!fs.existsSync(daemonDir)) {
    throw new Error(`No se encontró el directorio del daemon de Antigravity en ${daemonDir}. Asegúrate de tener Antigravity abierto.`);
  }

  const files = fs
    .readdirSync(daemonDir)
    .filter((f) => f.startsWith('hub_') && f.endsWith('.json'))
    .map((f) => {
      const full = path.join(daemonDir, f);
      return { name: f, full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  for (const file of files) {
    try {
      const hub = JSON.parse(fs.readFileSync(file.full, 'utf8'));
      if (hub.httpPort && hub.csrfToken && isProcessAlive(hub.pid)) {
        return {
          ...process.env,
          ANTIGRAVITY_LS_ADDRESS: `localhost:${hub.httpPort}`,
          ANTIGRAVITY_CSRF_TOKEN: hub.csrfToken,
        };
      }
    } catch {}
  }

  // Fallback al archivo más reciente aunque no hayamos podido verificar el PID
  if (files.length > 0) {
    const hub = JSON.parse(fs.readFileSync(files[0].full, 'utf8'));
    if (hub.httpPort && hub.csrfToken) {
      return {
        ...process.env,
        ANTIGRAVITY_LS_ADDRESS: `localhost:${hub.httpPort}`,
        ANTIGRAVITY_CSRF_TOKEN: hub.csrfToken,
      };
    }
  }

  throw new Error('No se encontró ningún proceso activo de Antigravity en ~/.gemini/antigravity/daemon.');
}

export async function runGeminiCliAgent({ model, prompt, worktreePath, cardTitle }) {
  const env = loadEnv();
  const modelFlag =
    model === 'argon'
      ? env.AI_RUNNER_MODEL_ARGON || 'pro'
      : env.AI_RUNNER_MODEL_FLASH || 'flash';

  let agyBin;
  let agyEnv;
  try {
    agyBin = resolveAntigravityBin();
    agyEnv = resolveAntigravityDaemonEnv();
  } catch (err) {
    console.error(`❌ Error preparando entorno de Antigravity:`, err.message);
    return { success: false, error: err.message };
  }

  const title = `[${model.toUpperCase()}] ${cardTitle || 'Tarea Trello'}`.slice(0, 80);

  const isolatedPrompt = `${prompt}

=======================================================================
⚠️ INSTRUCCIÓN CRÍTICA DE AISLAMIENTO (GIT WORKTREE):
Estás ejecutando esta tarea en un entorno aislado.
Tu directorio de trabajo EXCLUSIVO es:
${worktreePath}

REGLAS OBLIGATORIAS PARA TUS HERRAMIENTAS:
1. En read_file, write_file y edit_file usa SIEMPRE rutas absolutas dentro de "${worktreePath}" (ejemplo: "${worktreePath}\\src\\...").
2. PROHIBIDO modificar archivos en la raíz "d:\\personal\\eftsimulator" fuera de "${worktreePath}".
3. En run_command antepón siempre el cambio a tu worktree: cd "${worktreePath}"; <tu comando>
4. Al terminar, guarda el resumen técnico en "${worktreePath}\\AI_SUMMARY.md".
5. No hagas preguntas al usuario; toma las decisiones técnicas necesarias y completa la tarea de principio a fin.
=======================================================================`;

  console.log(`🤖 Lanzando agente local de Antigravity (${model.toUpperCase()} -> --model=${modelFlag} en ${agyEnv.ANTIGRAVITY_LS_ADDRESS})...`);
  console.log(`📂 Worktree asignado: ${worktreePath}`);

  const spawnRes = spawnSync(
    agyBin,
    ['agentapi', 'new-conversation', `--model=${modelFlag}`, `--title=${title}`, isolatedPrompt],
    {
      cwd: worktreePath,
      env: agyEnv,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  if (spawnRes.error) {
    console.error(`❌ Error al invocar Antigravity agentapi:`, spawnRes.error.message);
    return { success: false, error: spawnRes.error.message };
  }

  if (spawnRes.status !== 0) {
    const errOut = (spawnRes.stderr || spawnRes.stdout || '').trim();
    console.error(`❌ Antigravity agentapi devolvió código ${spawnRes.status}: ${errOut}`);
    return { success: false, error: errOut };
  }

  let conversationId = null;
  try {
    const parsed = JSON.parse(spawnRes.stdout.trim());
    conversationId = parsed?.response?.newConversation?.conversationId;
  } catch (err) {
    console.error(`❌ No se pudo parsear la respuesta de agentapi:`, spawnRes.stdout);
    return { success: false, error: 'Respuesta JSON inválida de agentapi' };
  }

  if (!conversationId) {
    console.error(`❌ agentapi no devolvió un conversationId válido:`, spawnRes.stdout);
    return { success: false, error: 'Sin conversationId' };
  }

  console.log(`✅ Conversación iniciada en Antigravity Local | ID: ${conversationId}`);

  const transcriptPath = path.join(
    os.homedir(),
    '.gemini',
    'antigravity',
    'brain',
    conversationId,
    '.system_generated',
    'logs',
    'transcript.jsonl'
  );

  const maxWaitMs = 25 * 60 * 1000; // 25 minutos máximo por tarea
  const pollIntervalMs = 2500;
  const startTime = Date.now();
  let seenSteps = new Set();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    if (!fs.existsSync(transcriptPath)) {
      continue;
    }

    let rawContent = '';
    try {
      rawContent = fs.readFileSync(transcriptPath, 'utf8');
    } catch {
      continue;
    }

    const lines = rawContent
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let lastStep = null;

    for (const line of lines) {
      let step;
      try {
        step = JSON.parse(line);
      } catch {
        continue;
      }

      lastStep = step;

      if (!seenSteps.has(step.step_index)) {
        seenSteps.add(step.step_index);

        if (step.type === 'PLANNER_RESPONSE' && Array.isArray(step.tool_calls) && step.tool_calls.length > 0) {
          for (const tc of step.tool_calls) {
            const detail =
              tc.args?.Path ||
              tc.args?.toolSummary ||
              tc.args?.CommandLine ||
              '';
            console.log(`  ⚙️ [${model.toUpperCase()} Paso ${step.step_index}] ${tc.name}${detail ? `: ${detail}` : ''}`);
          }
        }
      }
    }

    if (!lastStep) continue;

    // Verificar si el modelo ya dio su respuesta final (PLANNER_RESPONSE en estado DONE y sin más tool_calls pendientes)
    if (
      lastStep.type === 'PLANNER_RESPONSE' &&
      lastStep.status === 'DONE' &&
      (!lastStep.tool_calls || lastStep.tool_calls.length === 0)
    ) {
      console.log(`🎉 Agente local Antigravity (${model.toUpperCase()}) ha completado la tarea.`);
      const finalContent = (lastStep.content || '').trim();

      // Si el agente no escribió AI_SUMMARY.md en el worktree, guardamos su respuesta final como resumen
      const summaryFile = path.resolve(worktreePath, 'AI_SUMMARY.md');
      if (!fs.existsSync(summaryFile) && finalContent) {
        try {
          fs.writeFileSync(summaryFile, finalContent, 'utf8');
        } catch {}
      }

      return {
        success: true,
        code: 0,
        summary: finalContent,
      };
    }

    if (lastStep.status === 'ERROR' || lastStep.status === 'CANCELED') {
      console.warn(`⚠️ Conversación ${conversationId} terminó con estado: ${lastStep.status}`);
      return {
        success: false,
        error: `Estado de conversación: ${lastStep.status}`,
      };
    }
  }

  return {
    success: false,
    error: 'Tiempo máximo de espera (25 min) agotado para la conversación en Antigravity.',
  };
}
