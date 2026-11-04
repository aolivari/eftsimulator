import fs from 'node:fs';
import path from 'node:path';

export function loadEnv() {
  const localEnvPath = path.resolve(process.cwd(), '.env.local');
  const defaultEnvPath = path.resolve(process.cwd(), '.env');
  const targetPath = fs.existsSync(localEnvPath) ? localEnvPath : defaultEnvPath;

  if (!fs.existsSync(targetPath)) return {};
  const content = fs.readFileSync(targetPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

export function getTrelloConfig() {
  const env = loadEnv();
  const apiKey = env.TRELLO_API_KEY;
  const token = env.TRELLO_TOKEN;
  const boardInput = env.TRELLO_BOARD_URL_OR_ID;

  if (!apiKey || !token || !boardInput) {
    throw new Error('Configuración de Trello incompleta en .env (TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_URL_OR_ID)');
  }

  const match = boardInput.match(/trello\.com\/b\/([a-zA-Z0-9]+)/);
  const boardId = match ? match[1] : boardInput.trim();

  return { apiKey, token, boardId };
}
