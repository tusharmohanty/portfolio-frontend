export interface TrendPullbackRow {
  symbol: string;
  tradeDate: string;          // ISO date from backend
  lastClose: number;

  dayPct: number | null;
  weekPct: number | null;
  monthPct: number | null;

  atrPct: number | null;
  volumeRatio20: number | null;

  deltaInAtr: number | null;
  bucketRank: number | null;

  stoplossAtr1_5: number | null;
  stoplossEma20MinusAtr: number | null;
}