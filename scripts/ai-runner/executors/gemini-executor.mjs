import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { loadEnv } from '../config.mjs';

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

  const modelId = model === 'argon' || model === 'pro' ? 'gemini-1.5-pro' : 'gemini-2.0-flash';
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

  const systemInstruction = `Eres un desarrollador senior autónomo. Tu objetivo es resolver la tarea de programación descrita en el prompt.
Tienes herramientas para leer archivos, editarlos y ejecutar comandos en la terminal.

${agentsMdContent ? `--- GUÍA DE ARQUITECTURA Y REGLAS DEL PROYECTO (AGENTS.md) ---
${agentsMdContent}
---------------------------------------------------------------` : ''}

Reglas operativas:
1. Sigue estrictamente las reglas de AGENTS.md (idioma español, arquitectura feature-first, shared/ui, types, etc.).
2. Inspecciona los archivos relevantes primero usando read_file.
3. Realiza los cambios necesarios con write_file.
4. Ejecuta comandos de validación (ej: npm run build o tests).
5. Crea el archivo AI_SUMMARY.md explicando detalladamente los cambios antes de finalizar.
6. Cuando todo esté verificado y compilando sin errores, llama a finish_task.`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: `Tarea a resolver:\n${prompt}` }],
    },
  ];

  let iterations = 0;
  const maxIterations = 20;

  while (iterations < maxIterations) {
    iterations++;
    console.log(`[Gemini Loop - Paso ${iterations}] Consultando al modelo...`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Error en la API de Gemini: ${errText}`);
      return { success: false, error: errText };
    }

    const data = await res.json();
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
  }

  return { success: true, summary: 'Ejecución finalizada tras iteraciones máximas.' };
}
