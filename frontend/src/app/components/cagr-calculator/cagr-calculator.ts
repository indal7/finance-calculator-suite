import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { CalculatorService, CagrResult } from '../../services/calculator';

@Component({
  selector: 'app-cagr-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './cagr-calculator.html',
  styleUrls: ['./cagr-calculator.css']
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
  openFaq: number | null = null;

  readonly faqs = [
    {
      q: 'What is a good CAGR for mutual funds in India?',
      a: 'A CAGR of 12–15% is considered good for equity mutual funds in India over a long-term horizon (10+ years). Large-cap funds typically deliver 10–13%, while mid-cap and small-cap funds may deliver 14–18% with higher volatility.'
    },
    {
      q: 'How is CAGR different from absolute return?',
      a: 'Absolute return tells you the total percentage gain regardless of time. CAGR normalises it to an annual rate. A 200% absolute return over 10 years is only about 11.6% CAGR — very different from 200% in 2 years (73.2% CAGR).'
    },
    {
      q: 'What is the CAGR of Nifty 50?',
      a: 'Nifty 50 has delivered approximately 12–13% CAGR over the last 20 years (2004–2024), though individual years vary significantly from -50% to +70%. This makes it a benchmark for evaluating mutual fund performance.'
    },
    {
      q: 'Can CAGR be negative?',
      a: 'Yes. If your ending value is less than your beginning value, CAGR will be negative. For example, ₹1,00,000 invested falling to ₹70,000 in 5 years gives a CAGR of -6.9%, indicating capital erosion.'
    }
  ];

  constructor() {
    this.title.setTitle('CAGR Calculator India – Stock Return & Annual Growth Rate Calculator 2026');
    this.meta.updateTag({ name: 'description',
      content: 'Free CAGR Calculator India. Calculate Compound Annual Growth Rate for stocks, mutual funds and investments. Compare annualised returns easily.' });
    this.meta.updateTag({ name: 'keywords',
      content: 'cagr calculator india, stock return calculator india, annual return calculator investment, cagr calculator for mutual funds india, compound annual growth rate' });
  }

  get f() { return this.form.controls; }

  syncSlider(field: string): void { /* reactive */ }

  syncFromSlider(field: string, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.form.get(field)?.setValue(val);
  }

  getSliderPct(field: string, min: number, max: number): number {
    const val = this.form.get(field)?.value ?? min;
    return Math.round(((val - min) / (max - min)) * 100);
  }

  getDonutOffset(beginning: number | null, ending: number | null): number {
    const safeBeginning = beginning ?? 0;
    const safeEnding = ending ?? 0;

    if (safeEnding <= 0) return 0;

    const pct = Math.min(safeBeginning / safeEnding, 1);
    return 220 * pct;
  }

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? null : index;
  }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { beginningValue, endingValue, years } = this.form.getRawValue() as {
      beginningValue: number; endingValue: number; years: number;
    };

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