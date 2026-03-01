export interface StockReturnsRow {
  symbol: string;
  tradeDate: string;
  lastClose: number | null;
  dayPct: number | null;
  weekPct: number | null;
  monthPct: number | null;
  trendAligned: boolean | null;
  volumeRatio20: number | null;
  atrPct: number | null;
}