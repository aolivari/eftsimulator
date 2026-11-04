import { loadEnv } from './config.mjs';

export async function sendTelegramNotification({ title, model, branchName, prUrl, summary }) {
  const env = loadEnv();
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('ℹ️ Notificaciones de Telegram omitidas (falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID).');
    return false;
  }

  const modelUpper = model.toUpperCase();
  const cleanSummary = (summary || 'Tarea finalizada y lista para revisión.')
    .replace(/[_*`\[\]]/g, '') // Quitar caracteres conflictivos para markdown basico
    .slice(0, 400);

  let message = `🚀 *¡Tarea completada por ${modelUpper}!*\n\n` +
    `📋 *HU:* ${title}\n` +
    `🌿 *Rama:* \`${branchName}\`\n`;

  if (prUrl) {
    message += `🔗 *Pull Request:* [Abrir en GitHub](${prUrl})\n\n`;
  } else {
    message += `\n`;
  }

  message += `📝 *Resumen:*\n${cleanSummary}`;

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
