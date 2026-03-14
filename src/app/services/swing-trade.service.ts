import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  SwingGroupPosition,
  SwingSortKey,
  SwingStatusFilter,
  SortDir
} from '../models/swing-group-position.model';
import { CreateSwingGroupRequest, AddTradesToGroupRequest } from '../models/swing-group-requests.model';

@Injectable({ providedIn: 'root' })
export class SwingTradeService {
  private http = inject(HttpClient);

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
    return this.http.post<number>('/api/swing/groups', req);
  }

  addTradesToGroup(groupId: number, req: AddTradesToGroupRequest): Observable<string> {
    return this.http.post(`/api/swing/groups/${groupId}/trades`, req, {
      responseType: 'text'
    });
  }
}