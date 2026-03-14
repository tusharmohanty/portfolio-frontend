export interface CreateSwingGroupRequest {
  symbol: string;
  exchange: string;
  thesisTitle: string;
  thesisNotes?: string;
  strategyTag?: string;
  timeframe?: string;
}

export interface AddTradesToGroupRequest {
  kiteTradeIds: number[];
}