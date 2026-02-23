// src/app/services/portfolio.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Holding } from '../models/holding.model';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly holdingsSubject = new BehaviorSubject<Holding[]>([]);
  readonly holdings$ = this.holdingsSubject.asObservable();

  // recommend: in dev use proxy "/api"
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  refreshHoldings() {
    this.http.get<Holding[]>(`${this.baseUrl}/holdings`)
      .subscribe({
        next: (rows) => this.holdingsSubject.next(rows ?? []),
        error: (e) => console.error('Failed to load holdings', e),
      });
  }

  // Derived fields you need for UI
  getInvested(h: Holding) {
    return h.quantity * h.averagePrice;
  }

  getCurrentValue(h: Holding) {
    return h.quantity * h.lastPrice;
  }

  getPLPercent(h: Holding) {
    const inv = this.getInvested(h);
    return inv ? (h.pnl / inv) * 100 : 0;
  }

  
}
