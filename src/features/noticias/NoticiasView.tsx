import { Newspaper } from 'lucide-react';
import { ViewTemplate } from '../../shared/ui';

/** Placeholder de la pestaña Noticias. La fase 5 sustituye el contenido sin tocar ETFSimulator. */
export function NoticiasView() {
  return (
    <ViewTemplate.Root id="noticias-view">
      <ViewTemplate.Section id="noticias-placeholder" variant="card">
        <ViewTemplate.Header
          icon={<Newspaper className="w-4 h-4" />}
          title="Noticias"
          description="Próximamente"
        />
      </ViewTemplate.Section>
    </ViewTemplate.Root>
  );
}
