import type {
  TimelineCycleSegment,
  MultiYearCustomCyclePlan,
  AssetClass,
} from '../types';

export const AVAILABLE_SEGMENT_TEMPLATES: Omit<TimelineCycleSegment, 'id' | 'durationYears'>[] = [
  {
    name: 'Expansión Tranquila',
    cyclePresetId: 'quiet_expansion_2013',
    type: 'expansion',
    color: '#059669', // Emerald
    tagline: 'Crecimiento sostenido, tipos bajos y baja volatilidad',
    annualReturnEstimates: {
      global_equity: 8.5,
      sp500: 9.5,
      tech: 13.0,
      bonds: 3.0,
      gold: 2.0,
      cash: 2.0,
      defensive_equity: 7.5,
    },
  },
  {
    name: 'Cohete / Rally Alcista',
    cyclePresetId: 'post_covid_rally_2020',
    type: 'expansion',
    color: '#0284c7', // Sky
    tagline: 'Recuperación explosiva liderada por innovación y tecnología',
    annualReturnEstimates: {
      global_equity: 18.0,
      sp500: 22.0,
      tech: 32.0,
      bonds: -1.0,
      gold: 5.0,
      cash: 0.5,
      defensive_equity: 12.0,
    },
  },
  {
    name: 'Shock de Inflación',
    cyclePresetId: 'inflation_shock_2022',
    type: 'crisis',
    color: '#e11d48', // Rose
    tagline: 'Subida agresiva de tipos: caída simultánea en bolsa y bonos',
    annualReturnEstimates: {
      global_equity: -15.0,
      sp500: -14.0,
      tech: -28.0,
      bonds: -16.0,
      gold: 6.0,
      cash: 1.5,
      defensive_equity: -4.0,
    },
  },
  {
    name: 'Gran Recesión / Crash',
    cyclePresetId: 'great_recession_2008',
    type: 'crisis',
    color: '#dc2626', // Red
    tagline: 'Colapso sistémico del crédito con bonos y oro como refugio',
    annualReturnEstimates: {
      global_equity: -32.0,
      sp500: -30.0,
      tech: -28.0,
      bonds: 12.0,
      gold: 15.0,
      cash: 3.0,
      defensive_equity: -18.0,
    },
  },
  {
    name: 'Pinchazo Tecnológico',
    cyclePresetId: 'dotcom_burst_2000',
    type: 'crisis',
    color: '#ea580c', // Orange
    tagline: 'Pérdida masiva en empresas tech y rotación a bonos y valor',
    annualReturnEstimates: {
      global_equity: -18.0,
      sp500: -20.0,
      tech: -45.0,
      bonds: 10.0,
      gold: 6.0,
      cash: 4.0,
      defensive_equity: -5.0,
    },
  },
  {
    name: 'Rebote y Recuperación',
    type: 'recovery',
    color: '#10b981', // Teal
    tagline: 'Fuerte despegue tras haber tocado suelo en la crisis',
    annualReturnEstimates: {
      global_equity: 24.0,
      sp500: 26.0,
      tech: 35.0,
      bonds: 2.0,
      gold: 6.0,
      cash: 1.0,
      defensive_equity: 16.0,
    },
  },
  {
    name: 'Estancamiento / Lateral',
    type: 'neutral',
    color: '#d97706', // Amber
    tagline: 'Mercado plano sin tendencia clara e inflación persistente',
    annualReturnEstimates: {
      global_equity: 2.0,
      sp500: 2.5,
      tech: 3.0,
      bonds: 3.5,
      gold: 7.0,
      cash: 2.5,
      defensive_equity: 3.0,
    },
  },
];

/**
 * Genera el plan predeterminado de 10 años adaptado a la duración seleccionada por el usuario.
 */
export function getDefault10YearTimelinePlan(totalYears = 10): MultiYearCustomCyclePlan {
  // Escala las duraciones si el usuario tiene un horizonte distinto a 10 años
  const ratio = totalYears / 10;
  const y1 = Math.max(1, Math.round(3 * ratio));
  const y2 = Math.max(1, Math.round(2 * ratio));
  const y3 = Math.max(1, Math.round(3 * ratio));
  const y4 = Math.max(1, totalYears - (y1 + y2 + y3));

  return {
    id: 'typical_economic_cycle',
    name: `Ciclo Económico Típico (${totalYears} años)`,
    badge: 'Recomendado',
    description: `Modelo completo de ciclo económico con expansión inicial, recesión intermedia en los años ${y1 + 1}–${y1 + y2} y fuerte recuperación posterior.`,
    totalYears,
    segments: [
      {
        id: 'seg-1',
        name: 'Expansión Inicial',
        cyclePresetId: 'quiet_expansion_2013',
        durationYears: y1,
        type: 'expansion',
        color: '#059669',
        tagline: 'Crecimiento sostenido y baja volatilidad',
        annualReturnEstimates: {
          global_equity: 8.5,
          sp500: 9.5,
          tech: 13.0,
          bonds: 3.0,
          gold: 2.0,
          cash: 2.0,
          defensive_equity: 7.5,
        },
      },
      {
        id: 'seg-2',
        name: 'Crisis / Recesión',
        cyclePresetId: 'great_recession_2008',
        durationYears: y2,
        type: 'crisis',
        color: '#dc2626',
        tagline: 'Shock macroeconómico y caída de valoraciones',
        annualReturnEstimates: {
          global_equity: -22.0,
          sp500: -24.0,
          tech: -28.0,
          bonds: 10.0,
          gold: 14.0,
          cash: 2.5,
          defensive_equity: -12.0,
        },
      },
      {
        id: 'seg-3',
        name: 'Rebote y Recuperación',
        cyclePresetId: 'post_covid_rally_2020',
        durationYears: y3,
        type: 'recovery',
        color: '#10b981',
        tagline: 'Recuperación fuerte y expansión de múltiplos',
        annualReturnEstimates: {
          global_equity: 20.0,
          sp500: 22.0,
          tech: 30.0,
          bonds: 1.0,
          gold: 4.0,
          cash: 1.0,
          defensive_equity: 14.0,
        },
      },
      {
        id: 'seg-4',
        name: 'Crecimiento Maduro',
        cyclePresetId: 'quiet_expansion_2013',
        durationYears: y4,
        type: 'expansion',
        color: '#0284c7',
        tagline: 'Fase madura con rentabilidades estables',
        annualReturnEstimates: {
          global_equity: 7.5,
          sp500: 8.5,
          tech: 11.0,
          bonds: 3.5,
          gold: 3.0,
          cash: 2.0,
          defensive_equity: 7.0,
        },
      },
    ],
  };
}

export const PRESET_TIMELINE_PLANS = (totalYears = 10): MultiYearCustomCyclePlan[] => [
  getDefault10YearTimelinePlan(totalYears),
  {
    id: 'early_crash',
    name: 'Crash Temprano (Años 1–2)',
    badge: 'Poder del DCA',
    description: 'La crisis golpea al inicio de la inversión. Las aportaciones periódicas compran a precios de derribo y multiplican el beneficio en los años siguientes.',
    totalYears,
    segments: [
      {
        id: 'ec-1',
        name: 'Crash Inicial / Recesión',
        cyclePresetId: 'great_recession_2008',
        durationYears: Math.max(1, Math.round(2 * (totalYears / 10))),
        type: 'crisis',
        color: '#dc2626',
        tagline: 'Caída inicial del 40% en bolsa',
        annualReturnEstimates: {
          global_equity: -25.0,
          sp500: -28.0,
          tech: -32.0,
          bonds: 11.0,
          gold: 14.0,
          cash: 3.0,
          defensive_equity: -14.0,
        },
      },
      {
        id: 'ec-2',
        name: 'Expansión Prolongada Post-Crisis',
        cyclePresetId: 'quiet_expansion_2013',
        durationYears: totalYears - Math.max(1, Math.round(2 * (totalYears / 10))),
        type: 'expansion',
        color: '#059669',
        tagline: 'El plan de ahorro aprovecha las participaciones baratas acumuladas',
        annualReturnEstimates: {
          global_equity: 10.5,
          sp500: 12.0,
          tech: 16.0,
          bonds: 3.0,
          gold: 3.0,
          cash: 1.5,
          defensive_equity: 9.0,
        },
      },
    ],
  },
  {
    id: 'late_crash',
    name: 'Riesgo de Secuencia (Crash Tardío)',
    badge: 'Prueba de Estrés al Retiro',
    description: 'Años dorados de crecimiento seguidos de un shock severo en la recta final del plan. Demuestra el riesgo de no tener activos defensivos con mucho capital acumulado.',
    totalYears,
    segments: [
      {
        id: 'lc-1',
        name: 'Mercado Alcista Prolongado',
        cyclePresetId: 'quiet_expansion_2013',
        durationYears: Math.max(2, totalYears - Math.max(1, Math.round(2 * (totalYears / 10)))),
        type: 'expansion',
        color: '#059669',
        tagline: 'Crecimiento sostenido y acumulación de patrimonio',
        annualReturnEstimates: {
          global_equity: 9.0,
          sp500: 10.5,
          tech: 14.0,
          bonds: 3.0,
          gold: 2.5,
          cash: 1.5,
          defensive_equity: 8.0,
        },
      },
      {
        id: 'lc-2',
        name: 'Shock Inflacionario / Crisis Final',
        cyclePresetId: 'inflation_shock_2022',
        durationYears: Math.max(1, Math.round(2 * (totalYears / 10))),
        type: 'crisis',
        color: '#e11d48',
        tagline: 'Caída abrupta con el capital al máximo',
        annualReturnEstimates: {
          global_equity: -18.0,
          sp500: -20.0,
          tech: -30.0,
          bonds: -12.0,
          gold: 8.0,
          cash: 2.0,
          defensive_equity: -6.0,
        },
      },
    ],
  },
  {
    id: 'golden_decade',
    name: 'Década Dorada (Expansión Sostenida)',
    badge: 'Escenario Muy Favorable',
    description: 'Crecimiento económico continuo y auge tecnológico sin recesiones profundas intermedias (estilo 1995–1999 o 2013–2017).',
    totalYears,
    segments: [
      {
        id: 'gd-1',
        name: 'Auge y Digitalización',
        cyclePresetId: 'roaring_nineties_1995',
        durationYears: totalYears,
        type: 'expansion',
        color: '#0284c7',
        tagline: 'Rendimientos elevados y efecto interés compuesto máximo',
        annualReturnEstimates: {
          global_equity: 12.0,
          sp500: 14.0,
          tech: 20.0,
          bonds: 3.5,
          gold: 1.0,
          cash: 2.0,
          defensive_equity: 10.0,
        },
      },
    ],
  },
];
