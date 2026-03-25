import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SipRequest  { monthlyInvestment: number; annualRate: number; years: number; }
export interface EmiRequest  { principal: number; annualRate: number; years: number; }
export interface FdRequest   { principal: number; annualRate: number; years: number; compoundingFrequency: number; }
export interface CagrRequest { beginningValue: number; endingValue: number; years: number; }

export interface SipResult  { totalInvested: number; estimatedReturns: number; totalValue: number; }
export interface EmiResult  { emi: number; totalPayment: number; totalInterest: number; }
export interface FdResult   { maturityAmount: number; totalInterest: number; principal: number; }
export interface CagrResult { cagr: number; absoluteReturn: number; totalGain: number; }

@Injectable({ providedIn: 'root' })
export class CalculatorService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;

  calculateSip(req: SipRequest): Observable<SipResult> {
    return this.http.post<SipResult>(`${this.apiBase}/sip`, req).pipe(catchError(this.handleError));
  }

  calculateEmi(req: EmiRequest): Observable<EmiResult> {
    return this.http.post<EmiResult>(`${this.apiBase}/emi`, req).pipe(catchError(this.handleError));
  }

  calculateFd(req: FdRequest): Observable<FdResult> {
    return this.http.post<FdResult>(`${this.apiBase}/fd`, req).pipe(catchError(this.handleError));
  }

  calculateCagr(req: CagrRequest): Observable<CagrResult> {
    return this.http.post<CagrResult>(`${this.apiBase}/cagr`, req).pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.message ?? err.message ?? 'Unknown API error';
    return throwError(() => new Error(msg));
  }
}
