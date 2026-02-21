import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Holding } from '../models/holding.model';

@Injectable({
  providedIn: 'root',
})
export class HoldingsService {
  constructor(private http: HttpClient) {}

  getHoldings(): Observable<Holding[]> {
    // IMPORTANT: go via nginx reverse proxy (single origin)
    return this.http.get<Holding[]>('/api/holdings');
  }
}
