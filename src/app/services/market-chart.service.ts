import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarketChartResponse } from '../models/market-chart';

export type ChartTimeframe = 'DAILY' | 'WEEKLY';

@Injectable({ providedIn: 'root' })
export class MarketChartService {
  constructor(private http: HttpClient) {}

  getChart(
    symbol: string,
    timeframe: ChartTimeframe,
    from?: string,
    to?: string
  ): Observable<MarketChartResponse> {
    let params = new HttpParams().set('timeframe', timeframe);

    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get<MarketChartResponse>(
      `/api/market/chart/${encodeURIComponent(symbol)}`,
      { params }
    );
  }

  getDailyChart(symbol: string, from?: string, to?: string): Observable<MarketChartResponse> {
    return this.getChart(symbol, 'DAILY', from, to);
  }

  getWeeklyChart(symbol: string, from?: string, to?: string): Observable<MarketChartResponse> {
    return this.getChart(symbol, 'WEEKLY', from, to);
  }
}