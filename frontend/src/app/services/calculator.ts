import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SipRequest  { monthlyInvestment: number; annualRate: number; years: number; }
export interface EmiRequest  { principal: number; annualRate: number; years: number; }
export interface FdRequest   { principal: number; annualRate: number; years: number; compoundingFrequency: number; }
export interface CagrRequest { beginningValue: number; endingValue: number; years: number; }

export interface SipResult  { totalInvested: number; estimatedReturns: number; totalValue: number; }
export interface EmiResult  { emi: number; totalPayment: number; totalInterest: number; }
export interface FdResult   { maturityAmount: number; totalInterest: number; principal: number; }
export interface CagrResult { cagr: number; absoluteReturn: number; totalGain: number; }

/** Standardised API envelope returned by the updated Lambda handlers. */
interface ApiResponse<T> { status: string; data: T; error?: string; requestId?: string; }

/** Safely extract the data payload from either the new envelope or the legacy flat format. */
function extractData<T>(res: ApiResponse<T> | T): T {
  // TODO: Remove legacy fallback once all Lambda endpoints are confirmed to return
  // the {status, data} envelope. Until then, accept either format gracefully.
  const envelope = res as ApiResponse<T>;
  return envelope.status !== undefined && envelope.data !== undefined
    ? envelope.data
    : (res as T);
}

@Injectable({ providedIn: 'root' })
export class CalculatorService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;

  calculateSip(req: SipRequest): Observable<SipResult> {
    return this.http.post<ApiResponse<SipResult>>(`${this.apiBase}/sip`, req).pipe(
      map(res => extractData(res)),
      catchError(this.handleError)
    );
  }

  calculateEmi(req: EmiRequest): Observable<EmiResult> {
    return this.http.post<ApiResponse<EmiResult>>(`${this.apiBase}/emi`, req).pipe(
      map(res => extractData(res)),
      catchError(this.handleError)
    );
  }

  calculateFd(req: FdRequest): Observable<FdResult> {
    return this.http.post<ApiResponse<FdResult>>(`${this.apiBase}/fd`, req).pipe(
      map(res => extractData(res)),
      catchError(this.handleError)
    );
  }

  calculateCagr(req: CagrRequest): Observable<CagrResult> {
    return this.http.post<ApiResponse<CagrResult>>(`${this.apiBase}/cagr`, req).pipe(
      map(res => extractData(res)),
      catchError(this.handleError)
    );
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const body = err.error as ApiResponse<unknown> | undefined;
    const msg = body?.error ?? err.message ?? 'Unknown API error';
    return throwError(() => new Error(msg));
  }
}
