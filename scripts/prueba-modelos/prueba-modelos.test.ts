// Pruebas automatizadas unitarias del banco de pruebas (Fase 3).
// Ejecutar con: node --test scripts/prueba-modelos/prueba-modelos.test.ts

import assert from 'node:assert/strict';
import test from 'node:test';
import { NOTICIAS_BANCO_PRUEBAS } from './dataset/noticias.ts';
import { EsquemaAnalisisNoticia, extraerJsonDeTexto, verificarCumplimientoLegal } from './esquema.ts';
import { evaluarFidelidad } from './evaluador.ts';
import type { ResultadoNoticia } from './tipos.ts';
import { UMBRALES_CALIDAD_PREFIJADOS } from './umbrales.ts';

test('Dataset contiene exactamente 20 noticias reales bien formadas', () => {
  assert.equal(NOTICIAS_BANCO_PRUEBAS.length, 20);
  for (const n of NOTICIAS_BANCO_PRUEBAS) {
    assert.ok(n.id.startsWith('noticia-'), `ID inválido: ${n.id}`);
    assert.ok(n.titular.length > 20, `Titular demasiado corto en ${n.id}`);
    assert.ok(n.extracto.length > 40, `Extracto demasiado corto en ${n.id}`);
    assert.ok(n.hechosClave.length >= 2, `Se requieren al menos 2 hechos en ${n.id}`);
    assert.ok(n.tickersEsperados.length >= 1, `Debe haber tickers esperados en ${n.id}`);
  }
});

test('Esquema Zod valida correctamente una respuesta válida', () => {
  const respuestaValida = {
    resumen:
      'El Banco Central Europeo redujo los tipos de interés en 25 puntos básicos ante la moderación de la inflación al 1,7% en septiembre.',
    efecto: 'positive',
    explicacionEfecto:
      'La bajada de tipos de interés reduce la rentabilidad esperada del monetario e impulsa el valor liquidativo de los bonos agregados.',
    tickersAfectados: ['AGGH', 'XEON'],
    esEducativo: true,
  };

  const resultado = EsquemaAnalisisNoticia.safeParse(respuestaValida);
  assert.equal(resultado.success, true);
});

test('Esquema Zod rechaza campos inválidos o ausentes', () => {
  const respuestaInvalida = {
    resumen: 'Muy corto',
    efecto: 'buy', // No permitido
    explicacionEfecto: 'corta',
    tickersAfectados: ['TICKER_INVENTADO'],
    esEducativo: false,
  };

  const resultado = EsquemaAnalisisNoticia.safeParse(respuestaInvalida);
  assert.equal(resultado.success, false);
});

test('extraerJsonDeTexto limpia bloques markdown y texto circundante', () => {
  const textoConMarkdown = `Aquí está el análisis solicitado:
\`\`\`json
{
  "resumen": "Resumen de prueba con más de veinte caracteres válidos.",
  "efecto": "neutral",
  "explicacionEfecto": "Explicación explicativa suficiente para el test.",
  "tickersAfectados": ["VWCE"],
  "esEducativo": true
}
\`\`\`
Espero que sirva de ayuda.`;

  const { esValido, parsed } = extraerJsonDeTexto(textoConMarkdown);
  assert.equal(esValido, true);
  assert.ok(parsed && typeof parsed === 'object');
  assert.equal((parsed as Record<string, unknown>).efecto, 'neutral');
});

test('Cumplimiento legal detecta y rechaza lenguaje prescriptivo o recomendaciones (Regla 1)', () => {
  const textoProhibido = 'Te recomendamos comprar acciones de tecnológicas ahora mismo para rotar cartera.';
  const chequeo1 = verificarCumplimientoLegal(textoProhibido);
  assert.equal(chequeo1.cumple, false);
  assert.ok(chequeo1.motivos.length >= 2);

  const textoEducativo =
    'El descenso de tipos tiende históricamente a favorecer la valoración de los activos de renta fija.';
  const chequeo2 = verificarCumplimientoLegal(textoEducativo);
  assert.equal(chequeo2.cumple, true);
  assert.equal(chequeo2.motivos.length, 0);
});

test('Evaluación de fidelidad puntúa positivamente hechos comprobados y penaliza alucinaciones', () => {
  const noticia = NOTICIAS_BANCO_PRUEBAS[0]!;
  const resultadoFiel: ResultadoNoticia = {
    idNoticia: noticia.id,
    modelo: 'modelo-test',
    proveedor: 'gemini',
    jsonValido: true,
    conformeEsquema: true,
    intentos: 1,
    latenciaMs: 1200,
    promptTokens: 200,
    completionTokens: 80,
    totalTokens: 280,
    costeUsd: 0.0001,
    costeEur: 0.00009,
    puntuacionFidelidad: 0,
    hechosRespaldados: 0,
    hechosTotales: noticia.hechosClave.length,
    alucinacionesDetectadas: [],
    cumplePoliticaLegal: true,
    motivosInfraccionLegal: [],
    errores: [],
    salida: {
      resumen:
        'El Banco Central Europeo recorta los tipos 25 puntos básicos hasta el 3.25% tras caer la inflación al 1.7% en septiembre.',
      efecto: 'positive',
      explicacionEfecto: 'Tercer recorte del año que alivia las condiciones financieras.',
      tickersAfectados: ['AGGH', 'XEON'],
      esEducativo: true,
    },
  };

  const evalFiel = evaluarFidelidad(noticia, resultadoFiel);
  assert.ok(evalFiel.puntuacionFidelidad >= 75, `Esperada fidelidad >= 75%, obtenida: ${evalFiel.puntuacionFidelidad}%`);
  assert.equal(evalFiel.alucinaciones.length, 0);

  // Caso con alucinación de cifra no existente
  const resultadoAlucinante: ResultadoNoticia = {
    ...resultadoFiel,
    salida: {
      ...resultadoFiel.salida!,
      resumen: 'El BCE subió tipos al 9.99% provocando una recesión del 88.5%.',
    },
  };
  const evalAluc = evaluarFidelidad(noticia, resultadoAlucinante);
  assert.ok(evalAluc.alucinaciones.length > 0, 'Debió detectarse alucinación numérica');
  assert.ok(evalAluc.puntuacionFidelidad < evalFiel.puntuacionFidelidad);
});

test('Umbrales de calidad prefijados son completos y coherentes', () => {
  assert.ok(UMBRALES_CALIDAD_PREFIJADOS.tasaMinimaJsonValidoFinal === 100);
  assert.ok(UMBRALES_CALIDAD_PREFIJADOS.tasaMinimaConformidadEsquema === 100);
  assert.ok(UMBRALES_CALIDAD_PREFIJADOS.tasaMinimaCumplimientoLegal === 100);
  assert.ok(UMBRALES_CALIDAD_PREFIJADOS.puntuacionMinimaFidelidad >= 80);
  assert.ok(UMBRALES_CALIDAD_PREFIJADOS.costeMaximoPorNoticiaEur <= 0.001);
});
