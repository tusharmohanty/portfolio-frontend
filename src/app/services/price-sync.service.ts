import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PriceSyncService {
  constructor(private http: HttpClient) {}

  // Browser calls /api/... ; nginx strips /api and forwards to Spring
  syncHistorical() {
    return this.http.post('/api/sync/historical', {});
  }
}