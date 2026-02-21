export interface Holding {
  id: number;
  instrumentToken: string;
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
  dayChange: number;
  dayChangePercentage: number;
  syncedAt: string; // ISO string
}