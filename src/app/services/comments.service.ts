import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CommentItem } from '../models/comment.model';
import { db } from './comments-db'
@Injectable({
  providedIn: 'root'
})
export class CommentsService{
  private latestCommentSubject = new BehaviorSubject<CommentItem | null>(null);
  latestComment$ = this.latestCommentSubject.asObservable();

  private commentsHistorySubject =
      new BehaviorSubject<CommentItem[]>([]);

    commentsHistory$ =
      this.commentsHistorySubject.asObservable();


  private activeSymbol: string | null = null;


/* ============================
     Load Latest Comment
  ============================ */

  async loadLatest(symbol: string, type?: string) {

    this.activeSymbol = symbol;
    let query = db.comments
        .where('symbol')
        .equals(symbol);
    if (type) {
        query = query.and(c => c.type === type);
      }
    const data = await query
        .reverse()
        .sortBy('createdAt');

    const latest =
      data.length > 0
        ? data[0]
        : null;

    this.latestCommentSubject.next(latest);
  }



  /* ============================
       Load Full Comment History
    ============================ */

    async loadHistory(symbol: string) {

      this.activeSymbol = symbol;

      const data = await db.comments
        .where('symbol')
        .equals(symbol)
        .reverse()
        .sortBy('createdAt');

      this.commentsHistorySubject.next(data);
    }


  /* ============================
       Add Comment
    ============================ */

    async addComment(item: CommentItem) {

      const id = await db.comments.add({
        ...item,
        createdAt: new Date()
      });

      const saved = await db.comments.get(id);

      // Update latest immediately
      this.latestCommentSubject.next(saved ?? null);

      // Refresh history
      if (item.symbol) {
        await this.loadHistory(item.symbol);
      }
    }


  /* ============================
       Delete Comment
    ============================ */

    async deleteComment(id: number) {

      if (!this.activeSymbol) return;

      await db.comments.delete(id);

      // Refresh state
      await this.loadLatest(this.activeSymbol);
      await this.loadHistory(this.activeSymbol);
    }


    /* ============================
       Clear State
    ============================ */

    clearState() {
      this.latestCommentSubject.next(null);
      this.commentsHistorySubject.next([]);
      this.activeSymbol = null;
    }

  async getLatestThesis(symbol: string): Promise<CommentItem | null> {

    const theses = await db.comments
      .where('symbol')
      .equals(symbol)
      .and(c => c.type === 'THESIS')
      .reverse()
      .sortBy('createdAt');

    return theses.length ? theses[0] : null;
  }

}
