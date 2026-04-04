import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ShareRequest {
  calculator: 'sip' | 'emi' | 'fd' | 'cagr' | 'lumpsum';
  inputs: Record<string, number>;
}

export interface ShareResult {
  id: string;
  calculator: string;
  inputs: Record<string, number>;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;

  saveShare(req: ShareRequest): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(`${this.apiBase}/share`, req).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }

  getShare(id: string): Observable<ShareResult> {
    return this.http.get<ApiResponse<ShareResult>>(`${this.apiBase}/share/${encodeURIComponent(id)}`).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let msg = 'Something went wrong. Please try again.';
    if (err.status === 404) {
      msg = 'Share link not found or has expired.';
    } else if (err.status === 400) {
      const body = err.error as ApiResponse<unknown> | undefined;
      msg = body?.error ?? 'Invalid request.';
    } else if (err.status === 0) {
      msg = 'Network error. Please check your internet connection.';
    }
    return throwError(() => new Error(msg));
  }
}
