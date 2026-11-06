import type { BusinessCaseProfile } from '../types';

export const BUSINESS_CASES_DATA: BusinessCaseProfile[] = [
  {
    id: 'particular',
    title: 'Inversor Particular y Ahorrador Sistemático',
    subtitle: 'Construcción de patrimonio personal a largo plazo mediante aportaciones periódicas en ETFs',
    targetAudience: 'Ahorradores individuales, familias y profesionales que quieren rentabilizar sus ahorros sin regalar su rentabilidad al banco.',
    badge: 'B2C · Ahorro personal',
    painPoints: [
      {
        title: 'La factura invisible del 2% en fondos bancarios',
        description:
          'La mayoría de fondos comercializados por la gran banca española aplican comisiones de gestión y custodia entre el 1,5% y el 2,5% anual. En 20 años, esta mordida se queda con hasta el 35% de todo tu patrimonio acumulado.',
        impact: 'Pérdida de entre 30.000 € y 85.000 € en un plan medio.',
      },
      {
        title: 'Miedo al desplome del mercado (parálisis por análisis)',
        description:
          'El temor a invertir en máximos históricos y sufrir una crisis frena a millones de ahorradores, dejando su dinero perdiendo valor contra la inflación en cuentas corrientes al 0%.',
        impact: 'Pérdida continua de poder adquisitivo del 2% al 4% anual.',
      },
      {
        title: 'Opacidad y letra pequeña en brókers',
        description:
          'Costes por dividendo, custodia trimestral, comisiones de compra por tramos o spreads ocultos hacen que elegir dónde contratar los ETFs sea un laberinto confuso.',
        impact: 'Elegir el bróker erróneo cuesta miles de euros en costes fijos.',
      },
    ],
    whatWeOffer: [
      {
        title: 'Simulación probabilística Monte Carlo (3.000 futuros reales)',
        description:
          'Bootstrap sobre trimestres históricos reales de los últimos 20 años conservando las correlaciones reales entre activos, recentrado a tu expectativa de rentabilidad.',
        highlight: '3.000 escenarios probabilísticos reales',
      },
      {
        title: 'Prueba de estrés en crisis históricas (2000, 2008, 2020)',
        description:
          'Comprueba cómo se comporta tu plan ante la burbuja puntocom, la caída de Lehman Brothers o el crash del COVID. Descubre cómo las compras periódicas (DCA) amortiguan el impacto.',
        highlight: 'Resiliencia comprobada en caídas del −50%',
      },
      {
        title: 'Comparador independiente de brókers en España',
        description:
          'Ranking matemático por capital neto final con las tarifas reales de compra y custodia de Trade Republic, MyInvestor, ING y la banca tradicional.',
        highlight: 'Transparencia total de costes',
      },
      {
        title: 'Carteras modelo de autor con un solo clic',
        description:
          'Aplica estrategias indexadas legendarias como Boglehead clásico, Buffett 90/10 o Crecimiento Global sin complicaciones.',
        highlight: 'Modelos contrastados por premios Nobel',
      },
    ],
    benefits: [
      {
        title: 'Ahorro masivo en costes directos e indirectos',
        description:
          'Al cambiar fondos bancarios activos (TER 1,8% + custodia) por ETFs globales indexados (TER 0,15%), multiplicas el capital neto que se queda en tu bolsillo.',
        metric: '+33% más de capital final acumulado',
      },
      {
        title: 'Vacuna psicológica contra el pánico financiero',
        description:
          'Ver cómo un plan periódico histórico superó todas las crisis pasadas te otorga la convicción necesaria para no vender en pérdidas cuando la bolsa corrija.',
        metric: '100% disciplina inversora',
      },
      {
        title: 'Independencia total y sin conflictos de interés',
        description:
          'Herramienta 100% gratuita y neutral: no cobramos comisiones de retrocesión de fondos ni recomendamos productos para beneficio propio.',
        metric: '0 € en intermediarios opacos',
      },
    ],
    costSavingsSummary: {
      headline: 'Ahorra más de 48.000 € netos en comisiones bancarias',
      estimatedSavings: '48.200 €',
      timeHorizon: '25 años (2.000 € iniciales + 250 €/mes)',
      explanation:
        'Con una aportación de 250 € al mes y una rentabilidad bruta del 7% anual, la banca tradicional te deja con 146.000 € tras cobrarte más de 48.000 € en comisiones directas y rentabilidad perdida. Con ETF Simulator acumulas más de 194.000 € netos.',
    },
    story: {
      protagonist: 'Mateo',
      roleAndLocation: '36 años, ingeniero industrial en Valencia',
      context:
        'Mateo llevaba 5 años aportando 250 € cada mes al "Fondo Mixto Flexible" que le recomendó el gestor de su sucursal bancaria. Pensaba que "invertir en fondos era gratis porque el banco no le pasaba ningún recibo mensual al cobro".',
      conflict:
        'Un día revisó el documento de costes anuales (MiFID II) que su banco le envió por correo y descubrió términos incomprensibles como "gastos corrientes del 1,85%" y "custodia trimestral". No lograba entender por qué, a pesar de que el mercado subía con fuerza, el saldo de su fondo apenas se movía.',
      turningPoint:
        'Un compañero de trabajo le habló de ETF Simulator. Mateo introdujo sus 3.000 € iniciales y sus 250 € mensuales. Por primera vez vio en una gráfica limpia el efecto bola de nieve y comparó su fondo bancario contra una cartera indexada de ETFs mundiales (TER 0,20%) en un bróker sin custodia.',
      outcome:
        'El simulador le reveló que su banco se estaba quedando con casi un tercio de su futura jubilación (más de 45.000 € proyectados a 25 años). Mateo traspasó su estrategia a una cartera indexada Boglehead en MyInvestor. Además, tras probar la prueba de estrés de la crisis de 2008, superó su miedo a la volatilidad entendiendo que las caídas son el mejor momento para comprar participaciones baratas.',
      quote:
        '«Creía que un 2% de comisión era una tontería. Ver en la pantalla que ese 2% eran 48.000 € que no estarían en mi cuenta al jubilarme me abrió los ojos para siempre.»',
    },
  },
  {
    id: 'asesor',
    title: 'Asesores Financieros Independientes y Educadores',
    subtitle: 'Herramienta de consultoría interactiva, pedagogía patrimonial y diagnóstico sin conflictos',
    targetAudience: 'Asesores financieros (EAF, EFPA), planificadores patrimoniales, academias de educación financiera y divulgadores indexados.',
    badge: 'B2B / B2B2C · Asesoría y Formación',
    painPoints: [
      {
        title: 'Dificultad para hacer tangible el "fee drag" bancario',
        description:
          'Cuando un asesor le dice a un cliente potencial que su banco le cobra un 1,8% en fondos, el cliente suele responder: "¡Si solo es un uno y medio!". Los inversores particulares no visualizan el efecto destructor del interés compuesto inverso.',
        impact: 'Pérdida de oportunidades de captación de clientes de banca privada.',
      },
      {
        title: 'Pánico y fuga de clientes durante las caídas de mercado',
        description:
          'En mercados bajistas como 2022, los clientes no formados exigen liquidar su cartera en el peor momento posible (en pérdidas). Mantener la calma requiere pedagogía cuantitativa inmediata.',
        impact: 'Churn de clientes y destrucción patrimonial evitable.',
      },
      {
        title: 'Restricciones regulatorias severas (CNMV / MiFID II)',
        description:
          'Los asesores no pueden mostrar proyecciones lineales que prometan rentabilidades fijas. Se exige rigor metodológico, transparencia en costes y enfoque educativo.',
        impact: 'Riesgo de sanciones regulatorias y pérdida de confianza.',
      },
      {
        title: 'Herramientas de software institucional lentas y caras',
        description:
          'Plataformas como Bloomberg o Morningstar Direct cuestan entre 5.000 € y 25.000 € al año por licencia, con interfaces complejas que no sirven para interactuar cara a cara con el cliente.',
        impact: 'Sobrecoste operativo y fricción en las reuniones de consultoría.',
      },
    ],
    whatWeOffer: [
      {
        title: 'Demostración visual en vivo del ahorro de costes',
        description:
          'Permite sentarse con el cliente (presencialmente o por videollamada) y mover sliders en tiempo real para mostrar cuánto dinero rescata de su banco tradicional.',
        highlight: 'Impacto visual inmediato en 30 segundos',
      },
      {
        title: 'Simulador de escenarios de crisis como vacuna psicológica',
        description:
          'El asesor puede someter la cartera del cliente al crash puntocom o Lehman Brothers antes de que invierta, demostrando la recuperación sistemática con aportaciones mensuales.',
        highlight: 'Retención de clientes en mercados bajistas',
      },
      {
        title: '100% compliant con MiFID II y marco educativo',
        description:
          'Los cálculos se basan en bootstraps históricos deterministas y datos públicos verificados, con avisos legales explícitos que cumplen la normativa de información sin promesas engañosas.',
        highlight: 'Seguridad regulatoria para el profesional',
      },
      {
        title: 'Desglose anualizado del efecto bola de nieve',
        description:
          'Tablas interactivas año a año que enseñan al cliente exactamente cuánto dinero pone él y cuánto genera el interés compuesto a partir del año 7 y 10.',
        highlight: 'Pedagogía financiera de alto nivel',
      },
    ],
    benefits: [
      {
        title: 'Conversión de clientes multiplicada',
        description:
          'Ver con números personalizados que el asesor le ahorra 40.000 € o 100.000 € en comisiones ocultas del banco justifica al instante los honorarios profesionales del asesor independiente.',
        metric: '+70% tasa de conversión en primera reunión',
      },
      {
        title: 'Ahorro masivo en licencias de software',
        description:
          'Una plataforma web moderna, rápida y accesible desde cualquier navegador sin pagar cuotas abusivas por terminales antiguos.',
        metric: 'Ahorro de más de 6.000 €/año en software',
      },
      {
        title: 'Clientes fidelizados que no venden en pánico',
        description:
          'Al haber experimentado virtualmente las crisis pasadas en el simulador, el cliente entiende que una corrección es el mejor momento para mantener el plan de aportaciones.',
        metric: 'Reducción drástica del churn en caídas',
      },
    ],
    costSavingsSummary: {
      headline: 'Justifica los honorarios del asesor ahorrando 4.200 €/año a cada cliente',
      estimatedSavings: '4.200 € / año',
      timeHorizon: 'Por cada cliente con cartera de 200.000 €',
      explanation:
        'Un cliente con 200.000 € en banca tradicional paga unos 4.200 € al año en comisiones bancarias invisibles (2,1%). Trasladándolo a una cartera de ETFs indexados con asesoramiento independiente, el cliente ahorra 3.900 € netos al año incluso descontando la tarifa del asesor.',
    },
    story: {
      protagonist: 'Javier',
      roleAndLocation: '41 años, planificador financiero independiente (EAF) en Madrid',
      context:
        'Javier fundó su consultora independiente para ayudar a familias a invertir de forma sensata en carteras indexadas de bajo coste. Sin embargo, en las reuniones iniciales le costaba convencer a clientes escépticos que llevaban 20 años confiando ciegamente en su banco tradicional.',
      conflict:
        'En octubre de 2022, con el S&P 500 cayendo un 20%, Elena, una de sus clientas más importantes con 150.000 € invertidos, le llamó muy angustiada para vender toda su cartera y pasar el dinero a depósitos. Javier sabía que vender en ese momento supondría cristalizar pérdidas irreparables.',
      turningPoint:
        'Javier abrió ETF Simulator en una sesión compartida por pantalla. Introdujo los parámetros exactos de la cartera de Elena y activó el módulo de Ciclos Históricos. Simuló qué le ocurrió a un inversor idéntico durante la quiebra de Lehman Brothers en 2008 y durante el estallido del COVID en 2020.',
      outcome:
        'Elena vio con sus propios ojos cómo las aportaciones mensuales en medio de la tormenta de 2008 compraron participaciones a precio de ganga, duplicando el patrimonio neto apenas cuatro años después. No solo no retiró su dinero, sino que decidió aportar 5.000 € extraordinarios ese mismo mes. Hoy, la cartera de Elena está en máximos y Javier recomienda el simulador a todos sus clientes.',
      quote:
        '«ETF Simulator es la mejor herramienta de persuasión y tranquilidad que he usado en 15 años de asesoramiento. Convierte el miedo abstracto en evidencia matemática visual.»',
    },
  },
];

export const VALUE_PROPOSITION_COMPARISON = [
  {
    criterion: 'Comisiones anuales promedio',
    traditionalBank: '1,50% – 2,50% (TER + custodia)',
    excelSheet: 'Bajas (pero requiere mantenimiento manual)',
    roboAdvisors: '0,65% – 0,90% (Gestión + custodia)',
    etfSimulator: '0,07% – 0,22% (ETFs puros en brókers eficientes)',
  },
  {
    criterion: 'Simulación probabilística real',
    traditionalBank: 'No (proyecciones comerciales lineales)',
    excelSheet: 'No (fórmula fija de interés compuesto)',
    roboAdvisors: 'Limitada a tests internos opacos',
    etfSimulator: 'Sí: Monte Carlo con 3.000 caminos históricos',
  },
  {
    criterion: 'Pruebas de estrés en crisis reales',
    traditionalBank: 'No disponible',
    excelSheet: 'Muy compleja de modelar a mano',
    roboAdvisors: 'Solo gráficos teóricos estáticos',
    etfSimulator: 'Sí: 2000 (.com), 2008 (Lehman), 2020 (COVID)',
  },
  {
    criterion: 'Comparativa de brókers españoles',
    traditionalBank: 'Solo venden sus propios productos',
    excelSheet: 'Manual y propensa a errores',
    roboAdvisors: 'Solo su propio custodio asociado',
    etfSimulator: 'Ranking imparcial de brókers con tarifas reales',
  },
  {
    criterion: 'Independencia y conflictos de interés',
    traditionalBank: 'Comisiones de retrocesión altas',
    excelSheet: 'Neutral',
    roboAdvisors: 'Comisión propia recurrente de gestión',
    etfSimulator: '100% independiente, sin comisiones de venta',
  },
  {
    criterion: 'Cumplimiento normativo y rigor',
    traditionalBank: 'Foco comercial en captación de fondos',
    excelSheet: 'Riesgo de errores en fórmulas',
    roboAdvisors: 'Automatizado pero con poca personalización',
    etfSimulator: 'Enfoque educativo cuantitativo compatible MiFID II',
  },
];
