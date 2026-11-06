# Business Cases y Storytelling: ETF Simulator

> **Documento estratégico de producto, propuesta de valor y modelización económica.**  
> Aplicación web: [ETF Simulator](https://eftsimulator.vercel.app)

---

## 1. Resumen Ejecutivo

ETF Simulator es una plataforma cuantitativa e interactiva en React + TypeScript que simula y optimiza planes de ahorro en ETFs indexados para el mercado español. Combina un motor de proyección trimestral, un modelo Monte Carlo con 3.000 simulaciones sobre trimestres históricos reales desde 2005, pruebas de estrés ante las grandes crisis bursátiles de los últimos 25 años y un comparador de comisiones reales de compra y custodia entre brókers españoles y europeos.

Este documento formaliza los **dos business cases principales**, su narrativa humana (**storytelling**), el desglose exhaustivo de **qué ofrecemos**, las **ventajas competitivas**, los **beneficios cuantificados** y el **modelo económico de ahorro de costes**.

---

## 2. Business Case 1: Inversor Particular y Ahorrador Sistemático (B2C)

### 2.1. Perfil y Arquetipo del Usuario
- **Quién es:** Ahorrador particular, profesional o familia en España (25 a 55 años) con capacidad de ahorro mensual (de 100 € a 1.000 €/mes) y/o un colchón inicial (de 1.000 € a 50.000 €) que busca construir su jubilación, independencia financiera o el futuro de sus hijos.
- **Conocimiento financiero:** Principiante o intermedio; conoce el concepto de fondos indexados o ETFs pero duda ante la complejidad técnica o el miedo a equivocarse.

### 2.2. La Situación de Partida y el Conflicto
1. **La factura invisible del 2% en la banca tradicional:** En España, la gran banca (CaixaBank, Santander, BBVA, etc.) comercializa fondos de inversión activos con gastos corrientes (TER) del 1,50% al 2,25%, sumados a comisiones de custodia trimestral o corretaje. Al no cobrarse mediante un recibo bancario mensual sino detraerse del valor liquidativo diario, el ahorrador vive bajo la falsa ilusión de que *"invertir es gratis"*.
2. **Parálisis por análisis y pánico al desplome:** Millones de ahorradores mantienen su patrimonio en cuentas corrientes perdiendo del 2% al 4% anual frente a la inflación porque temen comprar en máximos históricos y sufrir una debacle como 2008 o 2020.
3. **Laberinto de tarifas en brókers:** La opacidad de cánones de bolsa, comisiones por dividendo, custodia trimestral y costes de intermediación dificulta elegir el bróker adecuado.

### 2.3. Storytelling: "El despertar de Mateo — La factura invisible del 1,8%"

> Mateo tiene 36 años y es ingeniero en Valencia. Llevaba 5 años aportando religiosamente 250 € al mes a un fondo que le contrató su banco de toda la vida: el *"Fondo Oportunidad Global"*. Pensaba que su banco no le cobraba nada porque jamás había visto una comisión en su extracto bancario.
>
> Sin embargo, al recibir el resumen anual MiFID II descubrió términos crípticos: *"gastos corrientes 1,85%"* y *"custodia de valores 0,30%"*. Al consultar a su banco, le dijeron: *"Es una comisión mínima, Mateo, solo un uno y medio largo por ciento, casi inapreciable"*.
>
> Al descubrir **ETF Simulator**, Mateo introdujo sus datos exactos: 3.000 € iniciales, 250 € mensuales y un horizonte a 25 años. La tarjeta contable le mostró la verdad matemática:
>
> **Ahorro neto al cambiar de su banco a ETFs indexados: 48.200 € limpios.**
>
> De los 194.000 € que generaba su esfuerzo, su banco se habría quedado con más de 48.000 € entre comisiones directas y rentabilidad compuesta no generada (*fee drag*). Tras probar el simulador de crisis históricas y ver cómo un plan periódico superó con creces la tormenta de 2008, Mateo traspasó su dinero a una cartera indexada en un bróker eficiente. Hoy sabe exactamente adónde va cada céntimo de su patrimonio.

### 2.4. Qué le Ofrecemos
- **Transparencia radical sin sesgo comercial:** Sin retrocesiones de fondos ni interés en vender productos específicos.
- **Proyección matemática exacta:** Visualización nítida del capital aportado de su bolsillo frente a la plusvalía generada por el interés compuesto.
- **Monte Carlo sobre trimestres reales:** 3.000 trayectorias basadas en la historia bursátil real desde 2005, mostrando percentiles de éxito y escenarios conservadores vs optimistas.
- **Estrés en crisis históricas:** Comprobación interactiva del comportamiento del plan ante la crisis .com (2000), la caída de Lehman (2008) y el crash COVID (2020).
- **Ranking de brókers en España:** Comparativa de Trade Republic, MyInvestor, ING y banca tradicional con costes reales calculados por cesta de ETFs y custodia.

### 2.5. Beneficios y Ventajas Cuantificadas
| Dimensión | Con Banca Tradicional | Con ETF Simulator | Beneficio Neto |
|---|---|---|---|
| **Comisión de gestión (TER)** | 1,80% anual | 0,15% anual (ETFs globales) | **−1,65% anual** |
| **Comisión de custodia** | 0,30% anual | 0,00% (brókers seleccionados) | **0 € en custodia** |
| **Capital final (250 €/mes, 25 años)** | 146.000 € | 194.200 € | **+48.200 € (+33%)** |
| **Psicología inversora** | Miedo y ventas en pánico | Disciplina cuantitativa | **Paz mental garantizada** |

---

## 3. Business Case 2: Asesores Financieros Independientes y Educadores (B2B / B2B2C)

### 3.1. Perfil y Arquetipo del Usuario
- **Quién es:** Asesores financieros certificados (EAF, EFPA, CFA, planificadores patrimoniales independientes), formadores de academias de inversión, divulgadores de finanzas personales y plataformas fintech.
- **Objetivo profesional:** Captar clientes descontentos con la banca tradicional, educar con rigor metodológico y retener clientes en períodos de turbulencia bursátil sin infringir las normativas de la CNMV y MiFID II.

### 3.2. La Situación de Partida y el Conflicto
1. **Dificultad para tangibilizar el "fee drag":** Decirle a un cliente potencial que su banco le cobra un 1,8% suena inofensivo. Los clientes no entienden el impacto del interés compuesto negativo a 10 o 20 años sin una gráfica interactiva.
2. **Pánico y fugas de clientes en mercados bajistas:** Cuando la bolsa cae un 15% o 20% (como en 2022), los clientes no formados exigen liquidar su cartera en pérdidas para refugiarse en depósitos, destruyendo su patrimonio y provocando *churn* al despacho.
3. **Rigidez regulatoria (MiFID II y CNMV):** Las exigencias legales prohíben garantizar rentabilidades futuras o realizar promesas engañosas. Se exige pedagogía sobre costes y escenarios desfavorables.
4. **Software institucional inasumible:** Herramientas como Bloomberg, FactSet o Morningstar Direct suponen un coste de entre 5.000 € y 25.000 € anuales por puesto, con interfaces áridas imposibles de usar en una reunión cara a cara con un cliente particular.

### 3.3. Storytelling: "El test de fuego de Elena — Cómo el asesor Javier evitó una venta en pánico"

> Javier es planificador financiero independiente (EAF) en Madrid. Su propuesta de valor es cobrar una tarifa transparente por asesorar a familias sobre carteras indexadas de bajo coste en brókers eficientes.
>
> En octubre de 2022, el mercado global acumulaba una caída superior al 18%. Elena, una clienta médica con 150.000 € asesorados, le telefoneó visiblemente nerviosa: *"Javier, esto se va a cero. Lo vendo todo y me voy a Letras del Tesoro o a la cuenta corriente"*.
>
> Javier no recurrió a discursos teóricos. Abrió una sesión compartida en su pantalla con **ETF Simulator**. Replicó la cartera de Elena y activó el módulo de **Ciclos Históricos**. Sometió su cartera a la Gran Crisis Financiera de 2008 y a la caída del COVID en marzo de 2020.
>
> En tiempo real, Elena vio que quien mantuvo sus aportaciones en medio del pánico de 2008 acumuló participaciones a precios de saldo, duplicando su patrimonio en los cuatro años posteriores.
>
> La evidencia cuantitativa calmó de inmediato su angustia. Elena no solo no canceló su plan: realizó una aportación extraordinaria de 5.000 € ese mismo mes. Tres años después, su patrimonio bate máximos históricos y Javier consolidó una relación de confianza indestructible para las próximas décadas.

### 3.4. Qué Ofrecemos al Profesional
- **Demostrador visual de comisiones en tiempo real:** Mueve los parámetros delante del cliente y demuestra al segundo cómo su banco le cuesta 4.000 € al año en una cartera de 200.000 €.
- **Simulador de crisis como "vacuna psicológica":** Aplica caídas del −40% antes de contratar la cartera para calibrar la tolerancia al riesgo real del cliente.
- **Cumplimiento MiFID II nativo:** Lenguaje educativo, cálculos sobre datos históricos auditados y sin promesas garantizadas de rentabilidad.
- **Herramienta ágil y ligera:** Cero coste de instalación, funciona en cualquier navegador, tableta o proyector.

### 3.5. Beneficios y Ventajas Cuantificadas para el Asesor
- **Conversión de clientes en primera reunión:** La demostración gráfica del ahorro en comisiones justifica de forma incontestable los honorarios profesionales del asesor independiente.
- **Retención en momentos de pánico:** Evita el *churn* de clientes en mercados bajistas transformando el pánico en convicción matemática.
- **Ahorro operativo de software:** Más de 6.000 € a 12.000 € anuales ahorrados en licencias institucionales innecesarias para la labor de divulgación y asesoramiento particular.

---

## 4. Matriz Comparativa frente a Alternativas

| Criterio | ETF Simulator | Banca Tradicional | Hojas de Excel | Robo-Advisors |
|---|---|---|---|---|
| **Coste del producto** | 100% gratuito | Comisiones altas (1,5%–2,5%) | Gratuito pero consume horas | 0,65%–0,90% recurrente |
| **Simulación Monte Carlo** | 3.000 caminos sobre historia real | No disponible | Fórmulas manuales frágiles | Enfoque de caja negra |
| **Prueba de estrés de crisis** | Sí (2000, 2008, 2020) | Ocultan las caídas pasadas | Difícil de calcular | Gráficos teóricos estáticos |
| **Comparativa de brókers** | Ranking imparcial y transparente | Solo venden su producto | Requiere recopilación manual | Solo operan con su custodio |
| **Conflicto de interés** | Cero comisiones de venta | Máximo (fondos propios) | Nulo | Comisión propia de gestión |
| **Cumplimiento MiFID II** | Marco educativo cuantitativo | Comercial / Venta | Sin auditoría | Automatizado |

---

## 5. Modelo Matemático del Ahorro de Costes

### 5.1. Fórmulas de Cálculo
Para un plan con capital inicial $C_0$, aportación mensual $A$, horizonte temporal de $N$ años ($M = 12 \cdot N$ meses) y rentabilidad anual bruta esperada $R_{bruta}$:

1. **Rentabilidad mensual neta:**
   $$r_{mensual} = (1 + R_{neta})^{1/12} - 1$$
   - En **Banca Tradicional:** $R_{neta} = R_{bruta} - (1,80\% \text{ TER} + 0,30\% \text{ custodia}) = R_{bruta} - 2,10\%$.
   - En **ETF Simulator:** $R_{neta} = R_{bruta} - (0,15\% \text{ TER} + 0,00\% \text{ custodia}) = R_{bruta} - 0,15\%$.

2. **Crecimiento compuesto mes a mes:**
   $$C_m = C_{m-1} \cdot (1 + r_{mensual}) + A$$

3. **Ahorro neto acumulado en el bolsillo del inversor:**
   $$\text{Ahorro} = C_{M}^{\text{ETF}} - C_{M}^{\text{Banco}}$$

### 5.2. Tabla de Ahorro según Perfil de Inversor (al 7% anual)

| Perfil / Escenario | Capital Inicial | Aportación Mes | Años | Capital Banco | Capital ETF Simulator | **Ahorro Neto en tu Bolsillo** |
|---|---|---|---|---|---|---|
| **Joven ahorrador DCA** | 1.000 € | 150 €/mes | 20 años | 53.600 € | 75.800 € | **+22.200 € (+41%)** |
| **Ahorrador sistemático** | 2.000 € | 250 €/mes | 25 años | 146.000 € | 194.200 € | **+48.200 € (+33%)** |
| **Familia patrimonio medio** | 15.000 € | 400 €/mes | 20 años | 179.500 € | 244.100 € | **+64.600 € (+36%)** |
| **Cartera consolidada** | 60.000 € | 800 €/mes | 15 años | 269.400 € | 342.300 € | **+72.900 € (+27%)** |
| **Gran patrimonio asesorado** | 150.000 € | 1.000 €/mes | 20 años | 601.200 € | 834.700 € | **+233.500 € (+39%)** |

---

## 6. Integración en el Producto

La funcionalidad está integrada en el simulador mediante:
1. **Módulo de interfaz interactivo (`src/features/casos-uso/`)**:
   - Pestaña accesible en la barra lateral de escritorio y en la navegación móvil.
   - Selector interactivo entre Caso 1 (Particular) y Caso 2 (Asesor).
   - Fichas de detalle con problemas, soluciones y beneficios.
   - Storytelling narrativo con desglose en cuatro fases y cita testimonial.
   - **Calculadora interactiva de ahorro de costes** en tiempo real con tarjeta negra contable y comparativa exhaustiva.
   - Matriz comparativa frente a alternativas del mercado.
2. **Motor de cálculo desacoplado (`src/engine/businessCases.ts`)**:
   - Funciones puras para simulación de crecimiento compuesto, deducción de costes y cálculo de años equivalentes de ahorro.
3. **Puntos de contacto desde el Resumen del Plan (`SimulacionView.tsx`)**:
   - Enlace directo desde *"Siguientes preguntas"* para guiar a los usuarios que acaban de calcular su número hacia la explicación de la propuesta de valor.
