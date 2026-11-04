import { Info } from 'lucide-react';

export const DEFAULT_DISCLAIMER =
  'Información educativa. No constituye recomendación de compra, venta ni asesoramiento financiero. Las rentabilidades pasadas no garantizan resultados futuros.';

export function LegalDisclaimer({ text }: { text?: string }) {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
    >
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <p className="font-medium leading-relaxed">
        <strong className="font-bold">Aviso legal: </strong>
        {text || DEFAULT_DISCLAIMER}
      </p>
    </div>
  );
}
