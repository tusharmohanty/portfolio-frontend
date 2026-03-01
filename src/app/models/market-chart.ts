export interface ChartBar {
  date: string;              // "YYYY-MM-DD"
  close: number | null;
  volume: number | null;

  ema20: number | null;
  ema50: number | null;
  ema200: number | null;

  rsi14: number | null;

  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
}

export interface MarketChartResponse {
  symbol: string;
  from: string;              // "YYYY-MM-DD"
  to: string;                // "YYYY-MM-DD"
  bars: ChartBar[];
}