export interface KiteTrade {
  id: number;
  tradeId: string;
  orderId?: string;

  exchange?: string;
  tradingsymbol?: string;

  transactionType?: string; // "buy" | "sell"
  product?: string | null;

  quantity?: number;
  price?: number;

  instrumentToken?: string | null;
  tradeTimestamp?: string; // ISO string
  syncedAt?: string;       // ISO string

  totalCharges?: number;

  migratedToInvst?: boolean;
  classification?: string;
}