import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SwingGroupPosition, SwingStatusFilter, SwingSortKey, SortDir } from '../models/swing-group-position.model';
import { AddTradesToGroupRequest, CreateSwingGroupRequest } from '../models/swing-group-requests.model';

@Injectable({ providedIn: 'root' })
export class SwingTradeService {
  constructor(private http: HttpClient) {}

  getGroups(status: SwingStatusFilter, sort: SwingSortKey, dir: SortDir): Observable<SwingGroupPosition[]> {
    let params = new HttpParams();
    if (status && status !== 'ALL') params = params.set('status', status);
    if (sort) params = params.set('sort', sort);
    if (dir) params = params.set('dir', dir);
    return this.http.get<SwingGroupPosition[]>('/api/swing/groups', { params });
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