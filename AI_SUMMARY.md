# AI_SUMMARY — Fase 5 · Pestaña «Noticias de mi plan»

## Qué se ha implementado
Una pestaña nueva (6.ª) con el digest diario de la composición de la cartera:

1. **Digest diario con fuentes**: resumen educativo del día y una tarjeta por noticia con enlace al titular original (`target="_blank" rel="noopener noreferrer"`), medio y fecha.
2. **Aviso legal visible** (`LegalDisclaimer`), siempre arriba: «información educativa, no recomendación». Usa el texto del digest si lo trae y, si no, uno por defecto.
3. **Historial**: barra lateral (horizontal en móvil) con los días anteriores; al pulsar uno se ve ese digest, marcado como «Histórico».
4. **De un vistazo qué afecta a la cartera**: franja de color por efecto (positivo/negativo/incierto/neutro), insignia «Afecta al X % de tu cartera» (o «Contexto general»), chips con ticker y peso en tu cartera, noticias ordenadas por peso afectado y un resumen superior («N de M noticias tocan tu cartera» + recuento por efecto).

Estados: cargando, error con «Reintentar», cartera vacía y sin digest todavía.

## Archivos
**Nuevos**
- `src/features/noticias/NoticiasView.tsx`, `index.ts`, `types.ts` — vista y tipos del contrato (`Digest`, `NewsItem`, `NewsEffect`…, mismos nombres que el contrato de la fase 0.5).
- `src/features/noticias/components/NewsItemCard.tsx`, `LegalDisclaimer.tsx`.
- `src/features/noticias/hooks/useDigests.ts`, `services/digestService.ts` — carga con `AbortController`.
- `src/engine/digest.ts` — lógica pura: composición normalizada, huella de composición (FNV-1a) y peso afectado.

**Modificado**: `src/app/ETFSimulator.tsx` — solo añade la pestaña `news` (import, unión del tipo, `Tabs.Trigger`, `Tabs.Panel` con `<NoticiasView etfs={etfs} />` y botón en el cajón móvil).

## Supuestos importantes (revisar)
- **La fase 4 (backend) no está en esta rama**, así que no existe `/api/digest`. La vista consume `GET /api/digest?hash=<huella>&composition=VWCE:60,AGGH:40&limit=30` y espera `{ digests: Digest[] }`. Si el contrato final difiere, basta con ajustar `digestService.ts`. Hasta entonces la pestaña muestra el estado de error con «Reintentar».
- **Rama**: se trabajó en `ai/sonet/hu-8-fase-5-...` (la creada por el runner), no en `feat/fase-5-interfaz-noticias`.
- Los tipos están en `features/noticias/types.ts` porque la rama del contrato (fase 0.5, `src/types/news.ts` y `digest.ts`) no está fusionada en `master`. Al fusionarla, conviene importar de `src/types` y borrar los duplicados. Esa rama también añade un `NoticiasView` placeholder y los mismos cambios en `ETFSimulator.tsx`: habrá que resolver ese conflicto quedándose con esta vista.
- Solo se envían al servidor huella, tickers y pesos agregados (regla 2 de producto); nada de usuario ni importes.

## Cómo probarlo
1. `npm run lint`, `npx tsc -b` y `npm run build` (todos pasan).
2. `npm run dev` y abrir la pestaña «Noticias de mi plan». Sin backend verás el estado de error.
3. Para ver datos, simular la respuesta, p. ej. en Playwright/DevTools interceptando `**/api/digest*` con `{ "digests": [ { id, compositionHash, date: "2026-11-04", composition: [], summary, disclaimer: "", generatedAt, news: [ { id, summary, effect: "negative", relatedTickers: ["VWCE"], source: { headline, url, publisher, publishedAt } } ] } ] }`. Así se verificó visualmente (escritorio) el digest, los chips de cartera, los enlaces y el cambio de día en el historial.
