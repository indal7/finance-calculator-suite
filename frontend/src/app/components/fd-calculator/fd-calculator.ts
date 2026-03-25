import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { CalculatorService, FdResult } from '../../services/calculator';

@Component({
  selector: 'app-fd-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './fd-calculator.html',
  styleUrl: './fd-calculator.css'
})
export class FdCalculator implements OnDestroy {
  private readonly fb    = inject(FormBuilder);
  private readonly svc   = inject(CalculatorService);
  private readonly title = inject(Title);
  private readonly meta  = inject(Meta);
  private sub?: Subscription;

  form = this.fb.group({
    principal:             [100000, [Validators.required, Validators.min(1)]],
    annualRate:            [7,      [Validators.required, Validators.min(0.01)]],
    years:                 [3,      [Validators.required, Validators.min(0.08)]],
    compoundingFrequency:  [4,      [Validators.required, Validators.min(1)]]
  });

  result: (FdResult & { localCalc: true }) | null = null;
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';

  readonly frequencies = [
    { label: 'Monthly (12)',    value: 12 },
    { label: 'Quarterly (4)',   value: 4  },
    { label: 'Half-Yearly (2)', value: 2  },
    { label: 'Annually (1)',    value: 1  }
  ];

  constructor() {
    this.title.setTitle('FD Calculator – Fixed Deposit Maturity Amount Calculator');
    this.meta.updateTag({ name: 'description',
      content: 'Calculate your Fixed Deposit maturity amount and interest earned with our free FD calculator. Supports quarterly, monthly and yearly compounding.' });
    this.meta.updateTag({ name: 'keywords',
      content: 'FD calculator, fixed deposit calculator, bank FD interest, maturity amount calculator' });
  }

  get f() { return this.form.controls; }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { principal, annualRate, years, compoundingFrequency } = this.form.getRawValue() as {
      principal: number; annualRate: number; years: number; compoundingFrequency: number;
    };

    // A = P × (1 + r/n)^(n*t)
    const r  = annualRate / 100;
    const n  = compoundingFrequency;
    const t  = years;
    const maturityAmount  = +(principal * Math.pow(1 + r / n, n * t)).toFixed(2);
    const totalInterest   = +(maturityAmount - principal).toFixed(2);

    this.result = { maturityAmount, totalInterest, principal, localCalc: true };

    this.apiStatus = 'loading';
    this.sub?.unsubscribe();
    this.sub = this.svc.calculateFd({ principal, annualRate, years, compoundingFrequency }).subscribe({
      next:  (res) => { this.result = { ...res, localCalc: true }; this.apiStatus = 'success'; },
      error: (err) => { this.apiError = err.message;              this.apiStatus = 'error';   }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
