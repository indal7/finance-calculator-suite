import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { CalculatorService, SipResult } from '../../services/calculator';

function positiveNumber(min = 0.01) {
  return Validators.compose([Validators.required, Validators.min(min)])!;
}

@Component({
  selector: 'app-sip-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './sip-calculator.html',
  styleUrl: './sip-calculator.css'
})
export class SipCalculator implements OnDestroy {
  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(CalculatorService);
  private readonly title   = inject(Title);
  private readonly meta    = inject(Meta);
  private sub?: Subscription;

  form = this.fb.group({
    monthlyInvestment: [5000,  positiveNumber()],
    annualRate:        [12,    positiveNumber()],
    years:             [10,    positiveNumber(1)]
  });

  result: (SipResult & { localCalc: true }) | null = null;
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';

  constructor() {
    this.title.setTitle('SIP Calculator – Calculate Systematic Investment Plan Returns');
    this.meta.updateTag({ name: 'description',
      content: 'Use our free SIP calculator to estimate returns on your monthly investments. See how compounding grows your wealth over time.' });
    this.meta.updateTag({ name: 'keywords',
      content: 'SIP calculator, systematic investment plan, mutual fund SIP, monthly investment returns' });
  }

  get f() { return this.form.controls; }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as { monthlyInvestment: number; annualRate: number; years: number };

    // ── Frontend calculation (instant) ──────────────────────────────────────
    const r   = annualRate / 100 / 12;       // monthly rate
    const n   = years * 12;                   // total months
    const fv  = r === 0
      ? monthlyInvestment * n
      : monthlyInvestment * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);

    const totalInvested     = +(monthlyInvestment * n).toFixed(2);
    const totalValue        = +fv.toFixed(2);
    const estimatedReturns  = +(totalValue - totalInvested).toFixed(2);

    this.result = { totalInvested, estimatedReturns, totalValue, localCalc: true };

    // ── Backend API call (async, for scalability) ────────────────────────────
    this.apiStatus = 'loading';
    this.sub?.unsubscribe();
    this.sub = this.svc.calculateSip({ monthlyInvestment, annualRate, years }).subscribe({
      next:  (res) => { this.result = { ...res, localCalc: true }; this.apiStatus = 'success'; },
      error: (err) => { this.apiError = err.message;              this.apiStatus = 'error';   }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
