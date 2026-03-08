import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PriceSyncService {
  constructor(private http: HttpClient) {}

  runEod() {
    return this.http.post('/api/sync/eod', {});
  }
}