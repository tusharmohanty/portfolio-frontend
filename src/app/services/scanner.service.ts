import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScanResult, ScanDefinition } from '../models/scanner.model';

@Injectable({ providedIn: 'root' })
export class ScannerService {
  private http = inject(HttpClient);
  private base = '/api';

  listScans(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/scans`);
  }

  getScanDefinitions(): Observable<ScanDefinition[]> {
    return this.http.get<ScanDefinition[]>(`${this.base}/scans/definitions`);
  }

  runScan(scanId: string): Observable<ScanResult> {
    return this.http.get<ScanResult>(`${this.base}/scans/${scanId}`);
  }
}
