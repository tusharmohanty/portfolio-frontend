export type SwingStatus = 'OPEN' | 'CLOSED';
export type SwingStatusFilter = 'OPEN' | 'CLOSED' | 'ALL';
export type SortDir = 'asc' | 'desc';

export type SwingSortKey =
  | 'updatedAt'
  | 'targetDeltaPct'
  | 'holdingPeriodDays'
  | 'plPct'
  | 'plPctDaily'
  | 'plPctWeekly'
  | 'plPctMonthly'
  | 'plPct15days';

export interface SwingGroupPosition {
  id: number;
  tradingsymbol: string;
  exchange: string;

  thesisTitle?: string | null;
  thesisNotes?: string | null;
  strategyTag?: string | null;
  timeframe?: string | null;
  riskNotes?: string | null;

  status: SwingStatus;

  openedAt?: string | null;
  closedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  targetPrice?: number | null;

  qty?: number | null;
  avgBuyPrice?: number | null;
  positionSize?: number | null;

  ltp?: number | null;
  ltpDate?: string | null;

  pl?: number | null;
  plPct?: number | null;

  targetDeltaPct?: number | null;
  holdingPeriodDays?: number | null;

  plWeekly?: number | null;
  plPctDaily?: number | null;
  plPctWeekly?: number | null;
  plPctMonthly?: number | null;
  plPct15days?: number | null;
}

export {};