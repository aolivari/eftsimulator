import { spawn } from 'node:child_process';
import path from 'node:path';

export async function runClaudeAgent({ model, prompt, worktreePath }) {
  console.log(`🤖 Iniciando agente Claude (${model}) en ${worktreePath}...`);

  // Mapear modelo si se especifica
  const modelFlag = model === 'opus' ? 'opus' : model === 'haiku' ? 'haiku' : 'sonnet';

  return new Promise((resolve, reject) => {
    // Se ejecuta en modo desatendido (headless): -p para prompt, sin pedir permisos
    const child = spawn('npx', ['-y', '@anthropic-ai/claude-code', '--dangerously-skip-permissions', '--model', modelFlag, '-p', prompt], {
      cwd: worktreePath,
      shell: true,
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
        console.warn(`⚠️ Agente Claude finalizó con código: ${code}`);
        resolve({ success: false, code });
      }
    });

    child.on('error', (err) => {
      console.error(`❌ Error ejecutando Claude CLI:`, err);
      reject(err);
    });
  });
}
