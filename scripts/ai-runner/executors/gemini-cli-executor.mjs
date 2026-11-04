import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../config.mjs';

// Gemini CLI oficial de Google instalado como devDependency.
// Se autentica con tu cuenta de Google (login en el navegador la primera vez),
// así que usa la cuota de tu suscripción y no la capa gratuita de la API.
// Se lanza con el propio Node (sin npx.cmd ni shell) para evitar el error EINVAL en Windows.
const GEMINI_BIN = fileURLToPath(
  new URL('../../../node_modules/@google/gemini-cli/bundle/gemini.js', import.meta.url)
);

export async function runGeminiCliAgent({ model, prompt, worktreePath }) {
  // Columna de Trello -> modelo de Gemini. Se puede sobrescribir desde .env.local.
  const env = loadEnv();
  const modelos = {
    argon: env.AI_RUNNER_MODEL_ARGON || 'gemini-4-argon',
    flash: env.AI_RUNNER_MODEL_FLASH || 'gemini-3.8-flash',
  };
  const modelId = modelos[model] || modelos.flash;
  console.log(`🤖 Iniciando Gemini CLI (${model} → ${modelId}) en ${worktreePath}...`);

  return new Promise((resolve) => {
    // El prompt va por stdin para no tener problemas de escapado de argumentos en Windows.
    // --yolo: aprueba todas las acciones (modo desatendido, sin preguntas).
    // --skip-trust: confía en el worktree temporal sin pedir confirmación.
    const child = spawn(
      process.execPath,
      [GEMINI_BIN, '-m', modelId, '--yolo', '--skip-trust', '-p', 'Resuelve la tarea descrita arriba.'],
      {
        cwd: worktreePath,
        stdio: ['pipe', 'inherit', 'inherit'],
        env: { ...process.env },
      }
    );

    child.stdin.write(prompt);
    child.stdin.end();

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Gemini CLI (${model}) ha completado la tarea.`);
        resolve({ success: true, code });
      } else {
        console.warn(`⚠️ Gemini CLI finalizó con código de error: ${code}`);
        resolve({ success: false, code });
      }
    });

    child.on('error', (err) => {
      console.error('❌ Error ejecutando Gemini CLI:', err.message);
      resolve({ success: false, error: err.message });
    });
  });
}
