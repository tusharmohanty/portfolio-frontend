import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CorePosition } from '../models/core-position.model';

@Injectable({ providedIn: 'root' })
export class CorePortfolioService {
  private readonly baseUrl = '/api/core';

  constructor(private http: HttpClient) {}

  getPositions(): Observable<CorePosition[]> {
    return this.http.get<CorePosition[]>(`${this.baseUrl}/positions`);
  }
}