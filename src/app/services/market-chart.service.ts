import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarketChartResponse } from '../models/market-chart';

@Injectable({ providedIn: 'root' })
export class MarketChartService {
  constructor(private http: HttpClient) {}

  getChart(symbol: string, from?: string, to?: string): Observable<MarketChartResponse> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    // If you're proxying Spring Boot behind nginx as /api, use '/api/market/...'
    // If Angular calls Spring directly, use '/market/...'
    return this.http.get<MarketChartResponse>(`/api/market/chart/${encodeURIComponent(symbol)}`, { params });
  }
}