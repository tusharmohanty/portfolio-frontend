import Dexie, { Table } from 'dexie';
import { CommentItem } from '../models/comment.model';
export class PortfolioDB extends Dexie {
  comments!: Table<CommentItem, number>;

  constructor() {
      super('PortfolioDB');
      this.version(2).stores({
              comments: '++id, symbol, createdAt '
            });
      }
  }
export const db = new PortfolioDB();
