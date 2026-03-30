import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  website?: string; // honeypot
}

export interface ContactResponse {
  message: string;
  submissionId: string;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;

  submitContact(req: ContactRequest): Observable<ContactResponse> {
    return this.http.post<ApiResponse<ContactResponse>>(`${this.apiBase}/contact`, req).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let msg = 'Something went wrong. Please try again later.';
    if (err.status === 400) {
      const body = err.error as ApiResponse<unknown> | undefined;
      msg = body?.error ?? 'Invalid input. Please check your details.';
    } else if (err.status === 429) {
      msg = 'Too many requests. Please wait a moment and try again.';
    } else if (err.status === 0) {
      msg = 'Network error. Please check your internet connection.';
    }
    return throwError(() => new Error(msg));
  }
}
