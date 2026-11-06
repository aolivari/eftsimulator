# AI_SUMMARY.md — Descripción de los Dos Business Cases + Storytelling

## 1. Resumen Claro de la Solución Implementada

Se ha implementado una solución completa, modular y alineada con la arquitectura del proyecto (`feature-first` + `shared/ui` + motores puros desacoplados en `engine/`) que responde a la historia de usuario:
**"Descripción de los dos business cases + storytelling. Qué ofrecemos, qué beneficios/ventaja/ahorro de costes tendrían por usar el producto."**

La solución aborda el reto en tres niveles:
1. **Nivel Estratégico y Documental (`docs/business-cases.md`)**:
   Documento formal exhaustivo que desglosa en profundidad:
   - El **Business Case 1 (Inversor Particular / Ahorro Sistemático B2C)**: perfil, problemas de mercado (la mordida del 2% bancario y el pánico a las caídas), relato humano (*Storytelling: El despertar de Mateo*), qué ofrecemos, beneficios tangibles y cuantificación de costes.
   - El **Business Case 2 (Asesores Financieros Independientes EAF/EFPA y Educadores B2B/B2B2C)**: perfil, problemas de consultoría (tangibilizar el *fee drag*, evitar ventas en pánico, compliance MiFID II, costes de terminales Bloomberg/Morningstar), relato humano (*Storytelling: El test de fuego de Elena y el asesor Javier*), propuesta de valor y retorno de negocio.
   - Matriz comparativa exhaustiva contra las alternativas (Banca tradicional, Hojas de Excel caseras, Robo-advisors y software institucional).
   - Fórmulas matemáticas de deducción de comisiones y tablas de ahorro según perfil patrimonial.

2. **Nivel de Motor de Cálculo Puro (`src/engine/businessCases.ts`)**:
   - Funciones puras independientes de React para calcular la comparativa matemática exacta mes a mes entre un fondo comercial de la banca tradicional (1,80% TER + 0,30% custodia = 2,10% anual) frente a una cartera indexada con ETF Simulator (0,15% TER + 0,00% custodia = 0,15% anual).
   - Métricas calculadas: Capital bruto sin comisiones, capital neto resultante en ambos escenarios, coste total pagado, pérdida por interés compuesto (*fee drag*), ahorro neto en euros, porcentaje de ganancia neta extra (+25% a +45%) y años de ahorro equivalentes ganados.

3. **Nivel de Interfaz de Usuario e Interacción (`src/features/casos-uso/`)**:
   - Vista completa `CasosUsoView` ensamblada con el compound component `ViewTemplate` (Root, Header, Section, Grid, Footer).
   - Componente selector interactivo `BusinessCaseSelector` para alternar entre el Caso 1 (Particular B2C) y el Caso 2 (Asesor/Educador B2B).
   - Componente `CaseDetailCard` con el diagnóstico de dolores de partida, qué ofrecemos y ventajas cuantificadas.
   - Componente `StorytellingSection` con diseño editorial en 4 etapas narrativas (Contexto, Conflicto, Inflexión con ETF Simulator, Resultado) y citas testimoniales destacadas.
   - Componente `InteractiveSavingsCalculator` que incluye:
     - Presets rápidos de 1 clic (*Joven ahorrador DCA*, *Familia patrimonio medio*, *Patrimonio consolidado*).
     - Controles interactivos con `BufferedNumberInput` y sliders para capital inicial, aportación mensual, horizonte de años y rentabilidad esperada.
     - Tarjeta negra contable con tipografía Geist Mono (`num`) que resalta el ahorro neto exacto y la equivalencia en años de ahorro.
     - Tabla comparativa detallada desglosando aportado, TER, custodia, coste acumulado y capital final neto.
   - Componente `ValuePropositionComparison` con la tabla comparativa frente a alternativas.
   - Navegación transversal: integrada en la barra lateral de escritorio (`Estrategia -> Casos y valor`), en la barra inferior móvil (`Casos`) y como enlace recomendado en *"Siguientes preguntas"* dentro del Resumen General (`SimulacionView`).

---

## 2. Lista de Archivos Creados o Modificados y Por Qué

| Archivo | Tipo | Justificación |
|---|---|---|
| `docs/business-cases.md` | Creado | Documentación estratégica y técnica detallada de los 2 business cases, storytelling, propuesta de valor, ventajas competitivas, modelo matemático y tablas de ahorro. |
| `src/types/businessCases.ts` | Creado | Contratos e interfaces de TypeScript para perfiles de casos de uso, puntos de dolor, ofertas, beneficios, storytelling, parámetros y resultados de comparativa de costes. |
| `src/types/index.ts` | Modificado | Re-exportación limpia de los tipos de `businessCases.ts` como punto único de entrada de tipos compartidos. |
| `src/engine/businessCases.ts` | Creado | Motor puro desacoplado de React para la simulación matemática de crecimiento compuesto con deducción de costes bancarios vs ETFs y proyecciones temporales. |
| `src/data/businessCasesData.ts` | Creado | Datos estáticos curados con el contenido de los dos business cases, las narrativas de storytelling (Mateo y Elena/Javier) y la matriz comparativa de alternativas. |
| `src/features/casos-uso/types.ts` | Creado | Props tipadas de la vista `CasosUsoViewProps`. |
| `src/features/casos-uso/components/BusinessCaseSelector.tsx` | Creado | Selector interactivo accesible entre el Caso 1 (Particular B2C) y el Caso 2 (Asesores B2B). |
| `src/features/casos-uso/components/CaseDetailCard.tsx` | Creado | Tarjeta de desglose estructurado: problemas del mercado, qué ofrecemos y ventajas competitivas con métricas. |
| `src/features/casos-uso/components/StorytellingSection.tsx` | Creado | Sección de narrativa humana en 4 pasos con cita testimonial destacada. |
| `src/features/casos-uso/components/InteractiveSavingsCalculator.tsx` | Creado | Calculadora interactiva en tiempo real con tarjeta negra contable y comparativa exhaustiva de costes frente a la banca tradicional. |
| `src/features/casos-uso/components/ValuePropositionComparison.tsx` | Creado | Matriz comparativa entre ETF Simulator, Banca Tradicional, Hojas de cálculo y Robo-advisors. |
| `src/features/casos-uso/CasosUsoView.tsx` | Creado | Vista ensamblada mediante el compound component `ViewTemplate` respetando el sistema visual ("libro contable acromático"). |
| `src/features/casos-uso/index.ts` | Creado | Único punto de entrada del feature `casos-uso`, exponiendo `CasosUsoView`. |
| `src/features/simulacion/types.ts` | Modificado | Actualizada la firma de `onNavigateTab` para incluir `'cases'`. |
| `src/features/simulacion/SimulacionView.tsx` | Modificado | Añadida la pregunta *"¿Por qué usar este simulador frente a tu banco?"* en el bloque de *Siguientes preguntas* para navegación contextual directa hacia los casos de uso. |
| `src/app/ETFSimulator.tsx` | Modificado | Registro de la nueva pestaña `'cases'` en `TabId`, `MOBILE_TABS`, `SCREENS`, navegación lateral (`Tabs.SideList` -> `Estrategia`) y renderizado del panel `<Tabs.Panel value="cases">`. |

---

## 3. Cómo Probar y Revisar la Solución

1. **Verificación de tipos y calidad de código**:
   ```bash
   npx tsc -b
   npm run lint
   npm run build
   ```
   *Resultado:* 0 errores en TypeScript, 0 errores en ESLint (respetando las reglas de arquitectura y boundaries) y build de Vite exitoso en producción.

2. **Revisión en el navegador**:
   Arranca el servidor local:
   ```bash
   npm run dev
   ```
   Abre <http://localhost:5173>:
   - **Acceso desde la navegación lateral (escritorio)**: Observa en la barra lateral el nuevo grupo *"Estrategia"* con la opción *"Casos y valor"*. Haz clic para acceder directamente.
   - **Acceso desde la navegación móvil (tableta/móvil)**: En la barra inferior con joroba flotante, pulsa sobre la pestaña *"Casos"*.
   - **Acceso desde el Resumen General**: En la pestaña *"Resumen"*, baja a la sección *"Siguientes preguntas"* y pulsa sobre *"¿Por qué usar este simulador frente a tu banco?"*. Comprueba cómo te redirige fluidamente a la nueva pantalla.
   - **Interacción entre casos de uso**: Alterna entre el *Caso 1: Inversor Particular* y el *Caso 2: Asesores y Formadores*. Comprueba cómo se actualizan los dolores de partida, qué ofrecemos, los beneficios cuantificados y la historia de storytelling correspondiente (Mateo vs Elena/Javier).
   - **Uso de la calculadora interactiva de ahorro**:
     - Pulsa los botones de escenarios rápidos (*Joven ahorrador DCA*, *Familia patrimonio medio*, *Patrimonio consolidado*) y comprueba el recálculo instantáneo.
     - Modifica manualmente el capital inicial, la aportación mensual o los sliders de plazo y rentabilidad.
     - Verifica las cifras en la tarjeta negra contable (ahorro neto acumulado, equivalencia en años de ahorro gratis, capital final ETF Simulator vs Banca Tradicional).
   - **Revisión de la documentación estratégica**:
     - Abre y lee [`docs/business-cases.md`](docs/business-cases.md) para consultar el desglose formal, tablas económicas y modelos matemáticos.
