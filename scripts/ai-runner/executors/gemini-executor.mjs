import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { loadEnv } from '../config.mjs';

async function callGeminiWithRetry(url, payload, maxRetries = 8) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      let waitSeconds = 30 * attempt;
      try {
        const errJson = await res.json();
        const retryInfo = errJson.error?.details?.find((d) => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
          const parsed = parseInt(retryInfo.retryDelay, 10);
          if (!isNaN(parsed) && parsed > 0) {
            waitSeconds = Math.max(parsed + 5, waitSeconds);
          }
        }
      } catch {}

      console.warn(`⏳ Límite por minuto de la capa gratuita alcanzado (429). Pausando ${waitSeconds}s para renovar la ventana de cuota (Intento ${attempt}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error (${res.status}): ${errText}`);
    }

    return res.json();
  }
  throw new Error('Se superó el número de reintentos por rate limit (429).');
}

export async function runGeminiAgent({ model, prompt, worktreePath }) {
  console.log(`🤖 Iniciando agente Gemini (${model}) en ${worktreePath}...`);

  const env = loadEnv();
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn(`⚠️ No se encontró GEMINI_API_KEY en .env.local. Se usará modo simulado o fallback.`);
    const logFile = path.resolve(worktreePath, 'AI_AGENT_README.md');
    fs.writeFileSync(logFile, `# Tarea procesada por Gemini (${model})\n\nPrompt recibido:\n${prompt}\n\n*Nota: Añade GEMINI_API_KEY en .env.local para ejecución 100% autónoma con Gemini API.*`);
    return { success: true, summary: 'Archivo generado en espera de GEMINI_API_KEY' };
  }

  const modelId = 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  // Cargar AGENTS.md si existe en el proyecto
  const agentsMdPath = path.resolve(worktreePath, 'AGENTS.md');
  const agentsMdContent = fs.existsSync(agentsMdPath) ? fs.readFileSync(agentsMdPath, 'utf8') : '';

  const tools = [
    {
      functionDeclarations: [
        {
          name: 'read_file',
          description: 'Lee el contenido de un archivo en el repositorio.',
          parameters: {
            type: 'OBJECT',
            properties: { filePath: { type: 'STRING', description: 'Ruta relativa del archivo' } },
            required: ['filePath'],
          },
        },
        {
          name: 'write_file',
          description: 'Escribe o sobreescribe contenido en un archivo.',
          parameters: {
            type: 'OBJECT',
            properties: {
              filePath: { type: 'STRING', description: 'Ruta relativa del archivo' },
              content: { type: 'STRING', description: 'Contenido completo del archivo' },
            },
            required: ['filePath', 'content'],
          },
        },
        {
          name: 'run_command',
          description: 'Ejecuta un comando en la terminal (ej: npm test, npm run build).',
          parameters: {
            type: 'OBJECT',
            properties: { command: { type: 'STRING', description: 'Comando a ejecutar' } },
            required: ['command'],
          },
        },
        {
          name: 'finish_task',
          description: 'Llama a esta función cuando hayas completado y validado la tarea con éxito.',
          parameters: {
            type: 'OBJECT',
            properties: { summary: { type: 'STRING', description: 'Resumen de los cambios realizados' } },
            required: ['summary'],
          },
        },
      ],
    },
  ];

  const systemInstruction = `Eres un desarrollador senior autónomo. Tu objetivo es resolver la tarea de programación descrita en el prompt de la forma más directa y eficiente posible.
Tienes herramientas para leer archivos, editarlos y ejecutar comandos en la terminal.

${agentsMdContent ? `--- GUÍA DE ARQUITECTURA Y REGLAS DEL PROYECTO (AGENTS.md) ---
${agentsMdContent}
---------------------------------------------------------------` : ''}

Reglas operativas estrictas para máxima eficiencia:
1. Sigue estrictamente las reglas de AGENTS.md (idioma español, feature-first, etc.).
2. NO pierdas pasos ejecutando comandos exploratorios redundantes (no hagas múltiples "ls", "dir", "node -v").
3. Ve DIRECTO al grano: lee únicamente los archivos que necesitas modificar o crear.
4. Escribe la solución con write_file.
5. Ejecuta "npm run build" o tests de verificación.
6. Crea el archivo AI_SUMMARY.md explicando los cambios y llama inmediatamente a finish_task.`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: `Tarea a resolver:\n${prompt}` }],
    },
  ];

  let iterations = 0;
  const maxIterations = 25;

  while (iterations < maxIterations) {
    iterations++;
    console.log(`[Gemini Loop - Paso ${iterations}] Consultando al modelo...`);

    let data;
    try {
      data = await callGeminiWithRetry(url, {
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools,
      });
    } catch (err) {
      console.error(`❌ Error en la API de Gemini: ${err.message}`);
      return { success: false, error: err.message };
    }

    const candidate = data.candidates?.[0];
    if (!candidate) break;

    const parts = candidate.content?.parts || [];
    contents.push(candidate.content);

    const toolCalls = parts.filter((p) => p.functionCall);
    if (toolCalls.length === 0) {
      console.log('Gemini respondió sin llamadas a herramientas. Concluyendo.');
      break;
    }

    let isFinished = false;
    let finalSummary = '';
    const responseParts = [];

    for (const part of toolCalls) {
      const call = part.functionCall;
      console.log(`⚙️ Herramienta: ${call.name}(${JSON.stringify(call.args)})`);

      let toolResult = '';
      try {
        if (call.name === 'read_file') {
          const fullPath = path.resolve(worktreePath, call.args.filePath);
          toolResult = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : 'ERROR: Archivo no encontrado';
        } else if (call.name === 'write_file') {
          const fullPath = path.resolve(worktreePath, call.args.filePath);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, call.args.content, 'utf8');
          toolResult = 'OK: Archivo escrito correctamente';
        } else if (call.name === 'run_command') {
          toolResult = execSync(call.args.command, { cwd: worktreePath, encoding: 'utf8', stdio: 'pipe' });
        } else if (call.name === 'finish_task') {
          isFinished = true;
          finalSummary = call.args.summary;
          toolResult = 'OK: Tarea marcada como finalizada';
        }
      } catch (err) {
        toolResult = `ERROR: ${err.message}`;
      }

      responseParts.push({
        functionResponse: {
          name: call.name,
          response: { result: toolResult },
        },
      });
    }

    contents.push({ role: 'user', parts: responseParts });

    if (isFinished) {
      console.log(`🎉 Tarea completada con éxito por Gemini: ${finalSummary}`);
      return { success: true, summary: finalSummary };
    }

    // Pausa preventiva de 2.5s entre pasos para suavizar la ráfaga
    await new Promise((r) => setTimeout(r, 2500));
  }

  return { success: true, summary: 'Ejecución finalizada tras iteraciones máximas.' };
}
