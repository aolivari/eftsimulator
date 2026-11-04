// Catálogo de 20 noticias financieras reales en español para el banco de pruebas de Fase 3.
// Cubre todos los 8 ETFs del simulador (VWCE, SXR8, WCBR, XDWH, XDWS, AGGH, SGLD, XEON)
// y fuentes fidedignas (Cinco Días, Expansión, El Economista, Reuters España, Bolsamanía).

import type { NoticiaEntrada } from '../tipos.ts';

export const NOTICIAS_BANCO_PRUEBAS: NoticiaEntrada[] = [
  {
    id: 'noticia-01',
    titular: 'El BCE recorta los tipos de interés en 25 puntos básicos hasta el 3,25% ante la debilidad del crecimiento',
    medio: 'Cinco Días',
    fechaPublicacion: '2024-10-17',
    url: 'https://cincodias.elpais.com/mercados-financieros/2024-10-17/el-bce-baja-los-tipos-de-interes.html',
    extracto:
      'El Consejo de Gobierno del Banco Central Europeo (BCE) ha decidido este jueves rebajar el tipo de interés de la facilidad de depósito en 25 puntos básicos, situándolo en el 3,25%. Se trata del tercer recorte del año en respuesta a una inflación que cayó al 1,7% en septiembre y unas perspectivas económicas cada vez más frágiles en la eurozona.',
    tickersEsperados: ['AGGH', 'XEON'],
    efectoEsperado: 'positive',
    hechosClave: [
      'BCE recorta tipos 25 puntos básicos',
      'Tipo de facilidad de depósito en 3,25%',
      'Inflación cayó al 1,7% en septiembre',
      'Tercer recorte del año',
    ],
  },
  {
    id: 'noticia-02',
    titular: 'El S&P 500 alcanza nuevos máximos históricos impulsado por los resultados de las grandes tecnológicas',
    medio: 'Expansión',
    fechaPublicacion: '2024-10-18',
    url: 'https://www.expansion.com/mercados/2024/10/18/sp500-maximos-historicos.html',
    extracto:
      'Wall Street cerró con nuevas subidas lideradas por el índice S&P 500, que marcó un nuevo récord por encima de los 5.860 puntos. El optimismo sobre los beneficios empresariales en el sector de semiconductores y computación en la nube contrarrestó las dudas sobre la velocidad de bajadas de tipos de la Reserva Federal.',
    tickersEsperados: ['SXR8', 'VWCE'],
    efectoEsperado: 'positive',
    hechosClave: [
      'S&P 500 en récord por encima de 5.860 puntos',
      'Subidas impulsadas por semiconductores y nube',
      'Optimismo sobre beneficios empresariales en Wall Street',
    ],
  },
  {
    id: 'noticia-03',
    titular: 'El oro marca un récord histórico al superar los 2.700 dólares la onza por las tensiones geopolíticas',
    medio: 'El Economista',
    fechaPublicacion: '2024-10-18',
    url: 'https://www.eleconomista.es/mercados-cotizaciones/noticias/oro-record-historico-2700.html',
    extracto:
      'El precio del oro al contado superó por primera vez en la historia la cota psicológica de los 2.700 dólares por onza troy. La escalada en Oriente Medio y la incertidumbre en torno a las elecciones presidenciales de Estados Unidos han disparado la demanda de activos refugio, acumulando una subida de más del 30% en el año.',
    tickersEsperados: ['SGLD'],
    efectoEsperado: 'positive',
    hechosClave: [
      'Oro supera 2.700 dólares por onza troy',
      'Récord impulsado por tensiones en Oriente Medio y elecciones de EE.UU.',
      'Subida acumulada superior al 30% en el año',
    ],
  },
  {
    id: 'noticia-04',
    titular: 'El gasto global en ciberseguridad crecerá un 15% en 2025 ante el aumento de ataques impulsados por IA',
    medio: 'Cinco Días',
    fechaPublicacion: '2024-10-22',
    url: 'https://cincodias.elpais.com/companias/2024-10-22/gasto-ciberseguridad-crecimiento-ia.html',
    extracto:
      'Un informe de la consultora Gartner proyecta que el gasto empresarial en soluciones de seguridad de la información y gestión de riesgos alcanzará los 212.000 millones de dólares en 2025. Las firmas de ciberseguridad se benefician de la necesidad urgente de las empresas de blindar sus infraestructuras críticas.',
    tickersEsperados: ['WCBR'],
    efectoEsperado: 'positive',
    hechosClave: [
      'Gasto global en ciberseguridad crecerá 15% en 2025',
      'Gasto total proyectado en 212.000 millones de dólares según Gartner',
      'Demanda acelerada por blindaje de infraestructuras críticas',
    ],
  },
  {
    id: 'noticia-05',
    titular: 'La inflación de la eurozona desciende al 1,8% y allana el terreno para más rebajas del BCE',
    medio: 'Reuters España',
    fechaPublicacion: '2024-10-01',
    url: 'https://es.reuters.com/markets/europe/inflacion-eurozona-bce-septiembre.html',
    extracto:
      'La tasa de inflación interanual de la zona euro cayó dos décimas en septiembre hasta el 1,8%, situándose por debajo del objetivo del 2% del BCE por primera vez en más de tres años. La moderación en los precios de la energía explica el descenso.',
    tickersEsperados: ['XEON', 'AGGH'],
    efectoEsperado: 'positive',
    hechosClave: [
      'Inflación de la zona euro cayó al 1,8% en septiembre',
      'Por debajo del objetivo del 2% por primera vez en tres años',
      'Caída explicada por precios de la energía',
    ],
  },
  {
    id: 'noticia-06',
    titular: 'Las farmacéuticas y el sector salud global se revalorizan ante la fuerte demanda de tratamientos GLP-1',
    medio: 'Expansión',
    fechaPublicacion: '2024-09-25',
    url: 'https://www.expansion.com/mercados/2024/09/25/sector-salud-glp1.html',
    extracto:
      'El sector farmacéutico y de biotecnología mundial continúa experimentando entradas récord de capital impulsado por el auge de los fármacos contra la obesidad y la diabetes tipo 2. Fabricantes como Novo Nordisk y Eli Lilly han revisado al alza sus previsiones anuales de ingresos.',
    tickersEsperados: ['XDWH'],
    efectoEsperado: 'positive',
    hechosClave: [
      'Sector salud impulsado por demanda de tratamientos GLP-1 para obesidad y diabetes',
      'Entradas récord de capital en biotecnología y farmacia',
      'Novo Nordisk y Eli Lilly revisan al alza previsiones de ingresos',
    ],
  },
  {
    id: 'noticia-07',
    titular: 'Nestlé y Unilever alertan de menor poder adquisitivo del consumidor y márgenes presionados',
    medio: 'Cinco Días',
    fechaPublicacion: '2024-10-17',
    url: 'https://cincodias.elpais.com/companias/2024-10-17/nestle-unilever-consumo-basico.html',
    extracto:
      'Los gigantes de consumo defensivo Nestlé y Unilever presentaron revisiones en sus guías de crecimiento de ventas orgánicas, acusando la resistencia de los consumidores a aceptar nuevas subidas de precios en alimentos envasados y productos de higiene.',
    tickersEsperados: ['XDWS'],
    efectoEsperado: 'negative',
    hechosClave: [
      'Nestlé y Unilever revisan guías de ventas orgánicas a la baja',
      'Consumidores muestran resistencia a subidas de precios',
      'Presión en márgenes operativos en consumo básico',
    ],
  },
  {
    id: 'noticia-08',
    titular: 'La rentabilidad del bono del Tesoro estadounidense a 10 años repunta hacia el 4,20% tras datos sólidos de empleo',
    medio: 'El Economista',
    fechaPublicacion: '2024-10-21',
    url: 'https://www.eleconomista.es/mercados/noticias/bono-tesoro-eeuu-10-anos.html',
    extracto:
      'El rendimiento del bono estadounidense a 10 años superó el 4,20% alcanzando niveles no vistos desde julio. Las sólidas cifras de creación de empleo en Estados Unidos han llevado a los inversores a moderar sus expectativas de recortes agresivos por parte de la Fed.',
    tickersEsperados: ['AGGH'],
    efectoEsperado: 'negative',
    hechosClave: [
      'Rendimiento del bono a 10 años supera el 4,20%',
      'Niveles más altos desde julio de 2024',
      'Moderación de expectativas de recortes agresivos de la Fed',
    ],
  },
  {
    id: 'noticia-09',
    titular: 'Las bolsas asiáticas y emergentes caen arrastradas por las dudas sobre los estímulos fiscales en China',
    medio: 'Bolsamanía',
    fechaPublicacion: '2024-10-15',
    url: 'https://www.bolsamania.com/noticias/mercados/bolsas-asiaticas-china-estimulos.html',
    extracto:
      'El índice Hang Seng de Hong Kong y el CSI 300 sufrieron caídas pronunciadas tras la última rueda de prensa del Ministerio de Finanzas chino, que no concretó el volumen del paquete de apoyo al sector inmobiliario.',
    tickersEsperados: ['VWCE'],
    efectoEsperado: 'negative',
    hechosClave: [
      'Caídas en índices bursátiles Hang Seng y CSI 300',
      'Ministerio de Finanzas chino no concretó volumen del paquete de estímulos',
      'Dudas sobre el rescate inmobiliario lastran a mercados emergentes',
    ],
  },
  {
    id: 'noticia-10',
    titular: 'El tipo €STR del mercado interbancario cae al 3,40% siguiendo las directrices de política monetaria',
    medio: 'Reuters España',
    fechaPublicacion: '2024-10-19',
    url: 'https://es.reuters.com/markets/estr-bce-tipos-interbancario.html',
    extracto:
      'El índice de referencia del euro a un día (€STR), calculado por el BCE, se fijó en el 3,398% tras el traslado efectivo del último recorte de tipos. Los gestores de fondos monetarios prevén que el rendimiento anualizado de los activos a ultra-corto plazo continúe descendiendo gradualmente.',
    tickersEsperados: ['XEON'],
    efectoEsperado: 'negative',
    hechosClave: [
      'Tipo €STR se fija en el 3,398%',
      'Traslado directo del recorte de facilidad de depósito del BCE',
      'Rendimiento de fondos monetarios descenderá gradualmente',
    ],
  },
  {
    id: 'noticia-11',
    titular: 'La Unión Europea endurece los requisitos de ciberseguridad con la entrada en vigor obligatoria de NIS2',
    medio: 'Cinco Días',
    fechaPublicacion: '2024-10-17',
    url: 'https://cincodias.elpais.com/legal/2024-10-17/directiva-nis2-ciberseguridad-ue.html',
    extracto:
      'A partir de este mes de octubre, miles de empresas de sectores esenciales y vitales en toda la UE deberán cumplir con la directiva NIS2, que impone sanciones de hasta 10 millones de euros por deficiencias graves en la gobernanza de seguridad digital.',
    tickersEsperados: ['WCBR'],
    efectoEsperado: 'positive',
    hechosClave: [
      'Entrada en vigor obligatoria de la directiva NIS2 en la UE',
      'Sanciones de hasta 10 millones de euros por fallos graves',
      'Obligación de auditorías e inversión en protección para miles de empresas',
    ],
  },
  {
    id: 'noticia-12',
    titular: 'Los resultados de ASML decepcionan al mercado por la desaceleración de la demanda fuera de la inteligencia artificial',
    medio: 'Expansión',
    fechaPublicacion: '2024-10-16',
    url: 'https://www.expansion.com/mercados/2024/10/16/asml-semiconductores-pedidos.html',
    extracto:
      'El fabricante de maquinaria de litografía para chips ASML recortó su previsión de ventas para 2025 hasta una horquilla de 30.000 a 35.000 millones de euros, tras registrar una captación de pedidos en el tercer trimestre de solo 2.600 millones, la mitad de lo esperado.',
    tickersEsperados: ['SXR8', 'VWCE'],
    efectoEsperado: 'negative',
    hechosClave: [
      'ASML rebaja previsión de ventas para 2025 a 30.000-35.000 millones de euros',
      'Pedidos del tercer trimestre en 2.600 millones (la mitad de lo esperado)',
      'Desaceleración en segmentos de semiconductores ajenos a la IA',
    ],
  },
  {
    id: 'noticia-13',
    titular: 'Los bancos centrales mundiales aumentan sus reservas de oro físico por noveno mes consecutivo',
    medio: 'El Economista',
    fechaPublicacion: '2024-10-08',
    url: 'https://www.eleconomista.es/mercados/noticias/bancos-centrales-reservas-oro.html',
    extracto:
      'El Consejo Mundial del Oro (WGC) reportó que los bancos centrales, encabezados por Polonia, Hungría y la India, compraron 48 toneladas netas de oro en agosto. La diversificación frente al dólar y la gestión de riesgos soberanos se mantienen como los motores estructurales de las compras oficiales.',
    tickersEsperados: ['SGLD'],
    efectoEsperado: 'positive',
    hechosClave: [
      'Compras netas de 48 toneladas de oro por bancos centrales en agosto',
      'Lideradas por Polonia, Hungría e India',
      'Objetivo de diversificación frente al dólar y gestión de riesgos soberanos',
    ],
  },
  {
    id: 'noticia-14',
    titular: 'Los reguladores estadounidenses aprueban un nuevo fármaco para el Alzheimer de Bristol Myers Squibb',
    medio: 'Cinco Días',
    fechaPublicacion: '2024-09-27',
    url: 'https://cincodias.elpais.com/companias/2024-09-27/fda-alzheimer-farmaco.html',
    extracto:
      'La Administración de Alimentos y Medicamentos de EE.UU. (FDA) otorgó la aprobación comercial a un tratamiento de nueva generación para el manejo de la enfermedad neurodegenerativa, ampliando la cartera terapéutica y las expectativas de ventas a largo plazo.',
    tickersEsperados: ['XDWH'],
    efectoEsperado: 'positive',
    hechosClave: [
      'Aprobación de la FDA para nuevo fármaco neurodegenerativo',
      'Expansión de cartera comercial y perspectivas de ventas a largo plazo',
      'Impulso a la innovación en biotecnología médica',
    ],
  },
  {
    id: 'noticia-15',
    titular: 'Procter & Gamble mantiene beneficios gracias a la fidelidad de marca a pesar de volúmenes planos',
    medio: 'Reuters España',
    fechaPublicacion: '2024-10-18',
    url: 'https://es.reuters.com/markets/procter-gamble-resultados-q1.html',
    extracto:
      'Procter & Gamble reportó un beneficio por acción de 1,93 dólares en su primer trimestre fiscal, superando las estimaciones de Wall Street. El gigante de bienes de consumo defensivo compensó el estancamiento en el volumen de unidades vendidas mediante un mix de productos premium.',
    tickersEsperados: ['XDWS'],
    efectoEsperado: 'neutral',
    hechosClave: [
      'Beneficio por acción de 1,93 dólares en el primer trimestre fiscal',
      'Supera previsiones de Wall Street por mix de productos premium',
      'Volumen global de unidades vendidas se mantiene plano (0% crecimiento en volumen)',
    ],
  },
  {
    id: 'noticia-16',
    titular: 'El precio del petróleo cae un 4% tras disiparse temores a un ataque sobre las refinerías de Irán',
    medio: 'Expansión',
    fechaPublicacion: '2024-10-15',
    url: 'https://www.expansion.com/mercados/2024/10/15/petroleo-brent-iran.html',
    extracto:
      'El barril de crudo Brent retrocedió hasta los 74 dólares después de que fuentes diplomáticas confirmaran que los objetivos de represalia militar se limitarán a instalaciones de defensa sin afectar a la infraestructura energética del Golfo Pérsico.',
    tickersEsperados: ['VWCE', 'AGGH'],
    efectoEsperado: 'positive',
    hechosClave: [
      'Barril de petróleo Brent cae 4% hasta los 74 dólares',
      'Se disipa el riesgo inminente de disrupción del suministro energético',
      'Alivio para las presiones inflacionistas globales',
    ],
  },
  {
    id: 'noticia-17',
    titular: 'CrowdStrike e incidentes de seguridad: el mercado premia la rapidez de respuesta tras la actualización fallida',
    medio: 'Cinco Días',
    fechaPublicacion: '2024-09-20',
    url: 'https://cincodias.elpais.com/tecnologia/2024-09-20/crowdstrike-recuperacion-mercado.html',
    extracto:
      'Las acciones de CrowdStrike han recuperado más del 35% desde sus mínimos de julio, respaldadas por una retención de clientes superior al 97%. Los analistas destacan que las corporaciones no han cancelado contratos ante la elevada dificultad técnica de migrar a otras plataformas de seguridad en la nube.',
    tickersEsperados: ['WCBR'],
    efectoEsperado: 'positive',
    hechosClave: [
      'Recuperación de más del 35% en cotización desde mínimos de julio',
      'Tasa de retención de clientes superior al 97%',
      'Altas barreras de salida en plataformas de ciberseguridad corporativa',
    ],
  },
  {
    id: 'noticia-18',
    titular: 'El Tesoro español coloca 5.000 millones en letras a tipos más bajos en consonancia con la senda del BCE',
    medio: 'El Economista',
    fechaPublicacion: '2024-10-15',
    url: 'https://www.eleconomista.es/mercados/noticias/tesoro-espana-letras-tipos-bajos.html',
    extracto:
      'El Tesoro Público adjudicó letras a 3 meses a un tipo de interés marginal del 3,18%, frente al 3,37% de la subasta previa de septiembre. En las letras a 9 meses, el rendimiento descendió al 2,84%, marcando el nivel más bajo en casi año y medio.',
    tickersEsperados: ['XEON', 'AGGH'],
    efectoEsperado: 'negative',
    hechosClave: [
      'Letras del Tesoro a 3 meses bajan su rendimiento al 3,18% (desde 3,37%)',
      'Letras a 9 meses caen al 2,84%, mínimo en casi año y medio',
      'Menor rentabilidad esperada para el inversor en deuda pública a corto plazo',
    ],
  },
  {
    id: 'noticia-19',
    titular: 'Las empresas europeas de consumo masivo incrementan el dividendo para retener a los inversores institucionales',
    medio: 'Cinco Días',
    fechaPublicacion: '2024-10-09',
    url: 'https://cincodias.elpais.com/mercados/2024-10-09/dividendos-consumo-defensivo.html',
    extracto:
      'Compañías como Danone, L\'Oréal y Heineken han anunciado incrementos medios del 4% en sus dividendos anuales. Su flujo de caja libre recurrente permite sostener una rentabilidad por dividendo atractiva en torno al 3,5% frente a alternativas de renta fija.',
    tickersEsperados: ['XDWS'],
    efectoEsperado: 'positive',
    hechosClave: [
      'Incremento medio del 4% en dividendos de empresas de consumo defensivo',
      'Rentabilidad por dividendo del sector en torno al 3,5%',
      'Sólido flujo de caja libre para fidelizar accionistas institucionales',
    ],
  },
  {
    id: 'noticia-20',
    titular: 'La Reserva Federal señala cautela con el ritmo de flexibilización ante la solidez de la economía estadounidense',
    medio: 'Reuters España',
    fechaPublicacion: '2024-10-14',
    url: 'https://es.reuters.com/markets/fed-tipos-discursos-cautela.html',
    extracto:
      'Varios presidentes regionales de la Fed enfatizaron que el banco central estadounidense debe proceder con prudencia a la hora de recortar los tipos de interés. Aunque la inflación avanza hacia la meta del 2%, el desempleo en el 4,1% no refleja un deterioro urgente que obligue a bajadas de emergencia.',
    tickersEsperados: ['SXR8', 'AGGH'],
    efectoEsperado: 'neutral',
    hechosClave: [
      'La Fed reitera prudencia en la velocidad de recorte de tipos',
      'Tasa de desempleo en el 4,1% refleja solidez del mercado laboral',
      'No hay urgencia de estímulos monetarios agresivos a corto plazo',
    ],
  },
];
