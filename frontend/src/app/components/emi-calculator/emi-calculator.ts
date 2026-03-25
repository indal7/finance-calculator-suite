import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { CalculatorService, EmiResult } from '../../services/calculator';

@Component({
  selector: 'app-emi-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './emi-calculator.html',
  styleUrl: './emi-calculator.css'
})
export class EmiCalculator implements OnDestroy {
  private readonly fb    = inject(FormBuilder);
  private readonly svc   = inject(CalculatorService);
  private readonly title = inject(Title);
  private readonly meta  = inject(Meta);
  private sub?: Subscription;

  form = this.fb.group({
    principal:   [500000, [Validators.required, Validators.min(1)]],
    annualRate:  [8.5,    [Validators.required, Validators.min(0.01)]],
    years:       [5,      [Validators.required, Validators.min(1)]]
  });

  result: (EmiResult & { localCalc: true }) | null = null;
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';

  constructor() {
    this.title.setTitle('EMI Calculator – Calculate Loan EMI Online');
    this.meta.updateTag({ name: 'description',
      content: 'Calculate your monthly EMI for home loans, car loans, or personal loans instantly. See interest and total payment breakdown.' });
    this.meta.updateTag({ name: 'keywords',
      content: 'EMI calculator, loan EMI calculator, home loan EMI, car loan EMI, personal loan calculator' });
  }

  get f() { return this.form.controls; }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { principal, annualRate, years } = this.form.getRawValue() as { principal: number; annualRate: number; years: number };

    const r = annualRate / 100 / 12;
    const n = years * 12;
    const emi = r === 0
      ? principal / n
      : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const totalPayment  = +(emi * n).toFixed(2);
    const totalInterest = +(totalPayment - principal).toFixed(2);

    this.result = { emi: +emi.toFixed(2), totalPayment, totalInterest, localCalc: true };

    this.apiStatus = 'loading';
    this.sub?.unsubscribe();
    this.sub = this.svc.calculateEmi({ principal, annualRate, years }).subscribe({
      next:  (res) => { this.result = { ...res, localCalc: true }; this.apiStatus = 'success'; },
      error: (err) => { this.apiError = err.message;              this.apiStatus = 'error';   }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
