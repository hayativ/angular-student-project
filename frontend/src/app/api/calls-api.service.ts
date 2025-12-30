import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CallsListResponse, Call } from '../models/call.model';
import { CallTranscript } from '../models/transcript.model';

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

  // BehaviorSubject to broadcast call updates across components
  private callUpdatedSubject = new BehaviorSubject<Call | null>(null);
  callUpdated$ = this.callUpdatedSubject.asObservable();

  getTranscript(id: string): Observable<CallTranscript> {
    return this.http.get<CallTranscript>(`${this.baseUrl}/calls/${id}/transcript`);
  }

  startCall(id: string): Observable<Call> {
    return this.http.post<Call>(`${this.baseUrl}/calls/${id}/start`, {}).pipe(
      tap(call => this.callUpdatedSubject.next(call))
    );
  }

  finishCall(id: string): Observable<Call> {
    return this.http.post<Call>(`${this.baseUrl}/calls/${id}/finish`, {}).pipe(
      tap(call => this.callUpdatedSubject.next(call))
    );
  }
}
