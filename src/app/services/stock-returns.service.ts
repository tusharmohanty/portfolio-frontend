import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockReturnsRow } from '../models/stock-returns-row';
import { TrendPullbackRow } from '../models/trend-pullback-row';

@Injectable({ providedIn: 'root' })
export class StockReturnsService {
  constructor(private http: HttpClient) {}

  latest(sortKey?: string, sortDir?: 'asc' | 'desc'): Observable<StockReturnsRow[]> {
    let params = new HttpParams();
    if (sortKey) {
      params = params.set('sort', `${sortKey},${sortDir ?? 'asc'}`);
    }
    return this.http.get<StockReturnsRow[]>('/api/market/returns/latest', { params });
  }
  trendPullbacks() {
  return this.http.get<StockReturnsRow[]>(`/api/market/returns/trend-pullbacks`);
}
}