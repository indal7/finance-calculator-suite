import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { CalculatorService, CagrResult } from '../../services/calculator';

@Component({
  selector: 'app-cagr-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './cagr-calculator.html',
  styleUrl: './cagr-calculator.css'
})
export class CagrCalculator implements OnDestroy {
  private readonly fb    = inject(FormBuilder);
  private readonly svc   = inject(CalculatorService);
  private readonly title = inject(Title);
  private readonly meta  = inject(Meta);
  private sub?: Subscription;

  form = this.fb.group({
    beginningValue: [50000,  [Validators.required, Validators.min(0.01)]],
    endingValue:    [100000, [Validators.required, Validators.min(0.01)]],
    years:          [5,      [Validators.required, Validators.min(0.08)]]
  });

  result: (CagrResult & { localCalc: true }) | null = null;
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';

  constructor() {
    this.title.setTitle('CAGR Calculator – Compound Annual Growth Rate Calculator');
    this.meta.updateTag({ name: 'description',
      content: 'Calculate the Compound Annual Growth Rate (CAGR) of your investment. Understand annualised returns easily with our free CAGR calculator.' });
    this.meta.updateTag({ name: 'keywords',
      content: 'CAGR calculator, compound annual growth rate, investment growth rate, annualised return calculator' });
  }

  get f() { return this.form.controls; }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { beginningValue, endingValue, years } = this.form.getRawValue() as {
      beginningValue: number; endingValue: number; years: number;
    };

    // CAGR = (EV/BV)^(1/n) - 1
    const cagr           = +(( Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100).toFixed(2);
    const absoluteReturn = +(((endingValue - beginningValue) / beginningValue) * 100).toFixed(2);
    const totalGain      = +(endingValue - beginningValue).toFixed(2);

    this.result = { cagr, absoluteReturn, totalGain, localCalc: true };

    this.apiStatus = 'loading';
    this.sub?.unsubscribe();
    this.sub = this.svc.calculateCagr({ beginningValue, endingValue, years }).subscribe({
      next:  (res) => { this.result = { ...res, localCalc: true }; this.apiStatus = 'success'; },
      error: (err) => { this.apiError = err.message;              this.apiStatus = 'error';   }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
