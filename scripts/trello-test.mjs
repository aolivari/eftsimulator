import fs from 'node:fs';
import path from 'node:path';

// 1. Cargar .env manualmente sin dependencias
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
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

const env = loadEnv();
const apiKey = env.TRELLO_API_KEY;
const token = env.TRELLO_TOKEN;
const boardInput = env.TRELLO_BOARD_URL_OR_ID;

if (!apiKey || !token || !boardInput) {
  console.error('\n❌ Faltan datos en el archivo .env:');
  if (!apiKey) console.error('  - TRELLO_API_KEY está vacía');
  if (!token) console.error('  - TRELLO_TOKEN está vacío');
  if (!boardInput) console.error('  - TRELLO_BOARD_URL_OR_ID está vacía');
  console.error('\nPor favor rellénalos al final de tu archivo .env y vuelve a ejecutar.\n');
  process.exit(1);
}

// Extraer ID o ShortLink de la URL de Trello (ej: https://trello.com/b/XXXXXX/nombre -> XXXXXX)
function extractBoardId(input) {
  const match = input.match(/trello\.com\/b\/([a-zA-Z0-9]+)/);
  return match ? match[1] : input.trim();
}

const boardId = extractBoardId(boardInput);

async function testTrello() {
  console.log(`\n🔍 Conectando con Trello para el tablero: ${boardId}...`);
  try {
    // Obtener info del tablero
    const boardRes = await fetch(`https://api.trello.com/1/boards/${boardId}?key=${apiKey}&token=${token}`);
    if (!boardRes.ok) {
      throw new Error(`Error ${boardRes.status}: ${await boardRes.text()}`);
    }
    const board = await boardRes.json();
    console.log(`✅ ¡Conexión exitosa! Tablero: "${board.name}" (${board.id})\n`);

    // Obtener listas (columnas)
    const listsRes = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`);
    if (!listsRes.ok) {
      throw new Error(`Error obteniendo listas ${listsRes.status}: ${await listsRes.text()}`);
    }
    const lists = await listsRes.json();

    console.log('📋 Columnas detectadas:');
    console.log('----------------------------------------------------');
    for (const list of lists) {
      console.log(`  • [${list.id}] -> ${list.name}`);
    }
    console.log('----------------------------------------------------');
    console.log('\n✨ Todo listo para que el agente empiece a trabajar con estas columnas.\n');
  } catch (err) {
    console.error('\n❌ Error al conectar con Trello:', err.message);
  }
}

testTrello();
