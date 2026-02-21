// Add below existing imports
export interface CommentItem {
  id?: number;
  symbol: string;
  text: string;
  createdAt: Date;
  duration ?: string;
  stopLoss ? :number | null;
  type:string;
  watch? :number | null;
}
