import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Binario de Claude Code instalado como devDependency en la raíz del repositorio.
// Se lanza directamente (sin npx.cmd ni shell): en Windows, Node no permite
// arrancar archivos .cmd sin shell (error EINVAL desde las versiones recientes).
const CLAUDE_BIN = fileURLToPath(
  new URL(
    process.platform === 'win32'
      ? '../../../node_modules/@anthropic-ai/claude-code/bin/claude.exe'
      : '../../../node_modules/@anthropic-ai/claude-code/bin/claude',
    import.meta.url
  )
);

export async function runClaudeAgent({ model, prompt, worktreePath }) {
  console.log(`🤖 Iniciando agente Claude (${model}) en ${worktreePath}...`);

  // Mapear modelo si se especifica
  const modelFlag = model === 'opus' ? 'opus' : model === 'haiku' ? 'haiku' : 'sonnet';

  return new Promise((resolve) => {
    const child = spawn(CLAUDE_BIN, ['--dangerously-skip-permissions', '--model', modelFlag, '-p', prompt], {
      cwd: worktreePath,
      stdio: 'inherit',
      env: {
        ...process.env,
      },
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Agente Claude (${model}) ha completado la tarea.`);
        resolve({ success: true, code });
      } else {
        console.warn(`⚠️ Agente Claude finalizó con código de error: ${code}`);
        resolve({ success: false, code });
      }
    });

    child.on('error', (err) => {
      console.error(`❌ Error ejecutando Claude CLI:`, err.message);
      resolve({ success: false, error: err.message });
    });
  });
}
