export type CorePeriod = '1D' | '1W' | '1M';

export interface CorePosition {
  symbol: string;

  totalInvestment: number;
  currentValue: number;
  pl: number;

  quantity: number;
  avgPrice: number;
  latestPrice: number;
  plLossPct: number;

  prevClose: number;
  dayPnl: number;
  dayPnlPct: number;

  weekPnl: number;
  weekPnlPct: number;

  monthPnl: number;
  monthPnlPct: number;
}

export interface CorePositionUi extends CorePosition {
  invWtPct: number;   // computed
  valWtPct: number;   // computed
  driftPct: number;   // computed (val - inv)
}