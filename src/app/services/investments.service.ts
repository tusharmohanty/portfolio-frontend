import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BulkMigrateRequest {
  kiteTradeIds: number[];
  notes?: string;
}

export interface MigrateResult {
  kiteTradeId: number;
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class InvestmentsService {
  private base = '/api/investments';

  constructor(private http: HttpClient) {}

  migrateBulk(req: BulkMigrateRequest): Observable<MigrateResult[]> {
    return this.http.post<MigrateResult[]>(`${this.base}/migrate`, req);
  }

  unmigrateOne(kiteTradeId: number): Observable<MigrateResult> {
    return this.http.post<MigrateResult>(`${this.base}/unmigrate/${kiteTradeId}`, {});
  }
}