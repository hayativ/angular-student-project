import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CallsListResponse, Call } from '../models/call.model';

@Injectable({ providedIn: 'root' })
export class CallsApiService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  getCalls(params: {
    page: number;
    limit: number;
    status?: string; // "all" | ...
    from?: string; // "YYYY-MM-DD"
    to?: string;
  }): Observable<CallsListResponse> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      httpParams = httpParams.set(k, String(v));
    });

    return this.http.get<CallsListResponse>(`${this.baseUrl}/calls`, { params: httpParams });
  }

  getCallById(id: string): Observable<Call> {
    return this.http.get<Call>(`${this.baseUrl}/calls/${id}`);
  }
}
