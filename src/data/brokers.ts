import type { BrokerRule } from '../types';

export const BROKER_CONFIGS: BrokerRule[] = [
  {
    id: 'ing_active',
    name: 'ING Bróker NARANJA (Plan Activo)',
    badge: 'Recomendado',
    description:
      '0 € en compras de ETFs promocionados y 0 € de custodia al hacer ≥ 1 operación por trimestre natural.',
    calculateBuyFee: (_amount, isPromo) => (isPromo ? 0 : 3.0 + _amount * 0.001),
    calculateCustodyFee: ({ operatedInQuarter, etfCount }) =>
      operatedInQuarter ? 0 : etfCount * 4.84,
  },
  {
    id: 'ing_inactive',
    name: 'ING (Escenario Inactivo)',
    description:
      'Penalización trimestral de custodia por inactividad: 4,84 € (IVA incl.) por cada ETF sin realizar compras.',
    calculateBuyFee: (amount) => 3.0 + amount * 0.001,
    calculateCustodyFee: ({ etfCount }) => etfCount * 4.84,
  },
  {
    id: 'myinvestor',
    name: 'MyInvestor',
    badge: 'Bajo coste',
    description: '0,12 % por compra/venta sin mínimo. 0 € de custodia sin condiciones.',
    calculateBuyFee: (amount) => amount * 0.0012,
    calculateCustodyFee: () => 0,
  },
  {
    id: 'traderepublic',
    name: 'Trade Republic',
    badge: 'Plan ahorro',
    description:
      '0 € en planes de ahorro programados (1 € en orden manual). Sin comisión de custodia.',
    calculateBuyFee: () => 0,
    calculateCustodyFee: () => 0,
  },
  {
    id: 'traditional_bank',
    name: 'Banca Tradicional',
    description:
      '12 € por operación de bolsa + 0,20 % anual de custodia (mínimo 5 €/trimestre).',
    calculateBuyFee: () => 12.0,
    calculateCustodyFee: ({ portfolioValue }) =>
      Math.max(5.0, (portfolioValue * 0.002) / 4),
  },
];
