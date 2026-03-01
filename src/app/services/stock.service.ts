import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StockCreateRequest } from '../components/stocks/add-stock-modal/add-stock-modal.component';

@Injectable({ providedIn: 'root' })
export class StockService {
  constructor(private http: HttpClient) {}

  createStock(req: StockCreateRequest) {
    // Assumes backend endpoint: POST /stocks (via nginx /api/ => spring sees /stocks)
    // Browser calls: /api/stocks
    return this.http.post('/api/stocks', req);
  }
}