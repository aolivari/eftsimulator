import { useState, useMemo } from 'react';
import { Briefcase, ArrowRight, ShieldCheck, BarChart3, Gauge, ShieldAlert } from 'lucide-react';
import { Badge, Button, ViewTemplate } from '../../shared/ui';
import { BUSINESS_CASES_DATA } from '../../data/businessCasesData';
import type { BusinessCaseId } from '../../types';
import type { CasosUsoViewProps } from './types';
import { BusinessCaseSelector } from './components/BusinessCaseSelector';
import { CaseDetailCard } from './components/CaseDetailCard';
import { StorytellingSection } from './components/StorytellingSection';
import { InteractiveSavingsCalculator } from './components/InteractiveSavingsCalculator';
import { ValuePropositionComparison } from './components/ValuePropositionComparison';

export function CasosUsoView({
  currentParams,
  onNavigateTab,
  initialCaseId = 'particular',
}: CasosUsoViewProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<BusinessCaseId>(initialCaseId);

  const selectedCase = useMemo(
    () => BUSINESS_CASES_DATA.find((c) => c.id === selectedCaseId) ?? BUSINESS_CASES_DATA[0],
    [selectedCaseId]
  );

  const monthlyEquivalent = currentParams
    ? currentParams.contributionFrequency === 'quarterly'
      ? Math.round(currentParams.quarterlyContribution / 3)
      : currentParams.quarterlyContribution
    : 250;

  return (
    <ViewTemplate.Root id="casos-uso-view">
      <ViewTemplate.Header
        icon={<Briefcase className="h-4 w-4" />}
        title="Casos de uso y propuesta de valor"
        description="Qué ofrecemos, qué ventajas obtienes y cómo ahorrar hasta decenas de miles de euros en comisiones frente a la banca tradicional."
        badge={<Badge tone="slate">Estratégico</Badge>}
        actions={
          onNavigateTab && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateTab('overview')}
              className="flex items-center gap-1.5"
            >
              <span>Ir al simulador</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )
        }
      />

      {/* Selector de Caso de Uso */}
      <ViewTemplate.Section id="cases-selector-section">
        <BusinessCaseSelector selectedId={selectedCaseId} onSelect={setSelectedCaseId} />
      </ViewTemplate.Section>

      {/* Ficha completa del Caso de Uso seleccionado */}
      <ViewTemplate.Section id="case-detail-section">
        <CaseDetailCard businessCase={selectedCase} />
      </ViewTemplate.Section>

      {/* Storytelling y narrativa humana */}
      <ViewTemplate.Section id="storytelling-section">
        <StorytellingSection
          story={selectedCase.story}
          caseTitle={selectedCase.title}
        />
      </ViewTemplate.Section>

      {/* Calculadora interactiva de ahorro de costes */}
      <ViewTemplate.Section id="calculator-section">
        <InteractiveSavingsCalculator
          initialParams={{
            initialCapital: currentParams?.initialCapital,
            monthlyContribution: monthlyEquivalent,
            years: currentParams?.years,
            annualReturn: currentParams?.annualReturn,
          }}
        />
      </ViewTemplate.Section>

      {/* Matriz comparativa frente a alternativas */}
      <ViewTemplate.Section id="matrix-section">
        <ValuePropositionComparison />
      </ViewTemplate.Section>

      {/* Accesos directos a las funcionalidades del producto */}
      {onNavigateTab && (
        <ViewTemplate.Section id="quick-links-section" variant="card" className="p-5 sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 mb-1">
            Empieza a poner a prueba tu plan
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mb-4">
            Aplica de inmediato las ventajas y herramientas de ETF Simulator en tu propia estrategia.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('overview')}
              className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-colors text-left cursor-pointer"
            >
              <div className="h-8 w-8 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-slate-900 block truncate">
                  Simular mi plan
                </span>
                <span className="text-xs text-slate-500 block truncate">
                  Proyección, KPIs y bola de nieve
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('cycles')}
              className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-colors text-left cursor-pointer"
            >
              <div className="h-8 w-8 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-slate-900 block truncate">
                  Prueba de crisis
                </span>
                <span className="text-xs text-slate-500 block truncate">
                  Monte Carlo y estrés 2008/2020
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('brokers')}
              className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-colors text-left cursor-pointer"
            >
              <div className="h-8 w-8 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Gauge className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-slate-900 block truncate">
                  Comparar brókers
                </span>
                <span className="text-xs text-slate-500 block truncate">
                  Ranking real de costes y custodia
                </span>
              </div>
            </button>
          </div>
        </ViewTemplate.Section>
      )}

      <ViewTemplate.Footer>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-xs text-slate-600">
            Información puramente educativa y cuantitativa conforme a MiFID II. No constituye recomendación individualizada.
          </span>
        </div>
      </ViewTemplate.Footer>
    </ViewTemplate.Root>
  );
}
