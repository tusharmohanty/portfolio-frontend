export type SwingStatusFilter = 'OPEN' | 'CLOSED' | 'ALL';
export type SortDir = 'asc' | 'desc';

export type SwingSortKey =
  | 'openedAt'
  | 'updatedAt'
  | 'pl'
  | 'plPct'
  | 'positionSize'
  | 'plPctDaily'
  | 'plPctWeekly'
  | 'plPctMonthly'
  | 'plPct15days'
  | 'targetDeltaPct'
  | 'holdingPeriodDays'
  | 'symbol';

export interface SwingGroupPosition {
  id: number;
  symbol: string;
  exchange?: string;
  thesisTitle: string;
  thesisNotes?: string;
  strategyTag?: string;
  timeframe?: string;
  riskNotes?: string;
  status: string;
  targetPrice?: number;
  openedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;

  qty?: number;
  avgBuyPrice?: number;
  positionSize?: number;
  ltp?: number;
  ltpDate?: string;

  pl?: number;
  plPct?: number;
  targetDeltaPct?: number;
  holdingPeriodDays?: number;

  plWeekly?: number;
  plPctDaily?: number;
  plPctWeekly?: number;
  plPct15days?: number;
  plPctMonthly?: number;
}