import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SwingGroupPosition, SwingStatusFilter, SwingSortKey, SortDir } from '../models/swing-group-position.model';
import { AddTradesToGroupRequest, CreateSwingGroupRequest } from '../models/swing-group-requests.model';

@Injectable({ providedIn: 'root' })
export class SwingTradeService {
  constructor(private http: HttpClient) {}

  getGroups(
  status: SwingStatusFilter,
  sort: SwingSortKey,
  dir: SortDir,
  symbol?: string
): Observable<SwingGroupPosition[]> {
  let url = `/api/swing/groups?status=${encodeURIComponent(status)}&sort=${encodeURIComponent(sort)}&dir=${encodeURIComponent(dir)}`;

  if (symbol && symbol.trim()) {
    url += `&symbol=${encodeURIComponent(symbol.trim())}`;
  }

  return this.http.get<SwingGroupPosition[]>(url);
}

  createGroup(req: CreateSwingGroupRequest): Observable<number> {
    // POST /api/swing/group-trades
    return this.http.post<number>('/api/swing/group-trades', req);
  }

  addTradesToGroup(groupId: number, req: AddTradesToGroupRequest): Observable<any> {
    // POST /api/swing/groups/{id}/trades
    return this.http.post(`/api/swing/groups/${groupId}/trades`, req);
  }
}



export {};