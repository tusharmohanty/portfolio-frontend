import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KiteTrade } from '../models/kite-trade.model';

@Injectable({ providedIn: 'root' })
export class TradesService {
  constructor(private http: HttpClient) {}

  getAllTrades(): Observable<KiteTrade[]> {
    return this.http.get<KiteTrade[]>('/api/trades?classification=UNCLASSIFIED');
  }
}