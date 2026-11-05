import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadEnv } from './config.mjs';

export async function sendTelegramRawMessage(message) {
  const env = loadEnv();
  const botToken = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('ℹ️ Notificaciones de Telegram omitidas (falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID).');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`⚠️ Telegram API error (${res.status}): ${errText}`);
      return false;
    }
    console.log('📱 Notificación enviada a Telegram con éxito.');
    return true;
  } catch (err) {
    console.warn(`⚠️ Error enviando mensaje a Telegram: ${err.message}`);
    return false;
  }
}

export async function sendTelegramNotification({ title, model, branchName, prUrl, summary }) {
  const modelUpper = (model || 'IA').toUpperCase();
  const cleanSummary = (summary || 'Tarea finalizada y lista para revisión.')
    .replace(/[_*`\[\]]/g, '') // Quitar caracteres conflictivos para Markdown básico de Telegram
    .slice(0, 400);

  let message = `🚀 *¡Tarea completada por ${modelUpper}!*\n\n` +
    `📋 *HU:* ${title || 'Tarea'}\n` +
    (branchName ? `🌿 *Rama:* \`${branchName}\`\n` : '');

  if (prUrl) {
    message += `🔗 *Pull Request:* ${prUrl}\n\n`;
  } else {
    message += `\n`;
  }

  message += `📝 *Resumen:*\n${cleanSummary}`;

  return sendTelegramRawMessage(message);
}

// Ejecución directa por CLI para asistentes de IA:
// 1) Mensaje directo: node scripts/ai-runner/telegram.mjs "Mensaje libre"
// 2) Estructurado:    node scripts/ai-runner/telegram.mjs --title "FASE X" --model "SONNET" --branch "feat/..." --pr "https://..." --summary "Resumen..."
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Uso: node scripts/ai-runner/telegram.mjs "Mensaje" | --title "..." --model "..." --branch "..." --pr "..." --summary "..."');
    process.exit(1);
  }

  const getFlag = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const hasFlags = args.some((a) => a.startsWith('--'));
  if (hasFlags) {
    await sendTelegramNotification({
      title: getFlag('--title') || 'Notificación de agente IA',
      model: getFlag('--model') || 'AI',
      branchName: getFlag('--branch'),
      prUrl: getFlag('--pr'),
      summary: getFlag('--summary') || '',
    });
  } else {
    const rawText = args.join(' ').replace(/[_*`\[\]]/g, '');
    await sendTelegramRawMessage(`🤖 *Aviso de IA:*\n\n${rawText}`);
  }
}
