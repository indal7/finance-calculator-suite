import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { CalculatorService, FdResult } from '../../services/calculator';

@Component({
  selector: 'app-fd-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './fd-calculator.html',
  styleUrls: ['./fd-calculator.css']
})
export class FdCalculator implements OnDestroy {
  private readonly fb    = inject(FormBuilder);
  private readonly svc   = inject(CalculatorService);
  private readonly title = inject(Title);
  private readonly meta  = inject(Meta);
  private sub?: Subscription;

  form = this.fb.group({
    principal:            [100000, [Validators.required, Validators.min(1)]],
    annualRate:           [7,      [Validators.required, Validators.min(0.01)]],
    years:                [3,      [Validators.required, Validators.min(0.08)]],
    compoundingFrequency: [4,      [Validators.required, Validators.min(1)]]
  });

  result: (FdResult & { localCalc: true }) | null = null;
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';
  openFaq: number | null = null;

  readonly frequencies = [
    { label: 'Monthly (12)',    value: 12 },
    { label: 'Quarterly (4)',   value: 4  },
    { label: 'Half-Yearly (2)', value: 2  },
    { label: 'Annually (1)',    value: 1  }
  ];

  readonly faqs = [
    {
      q: 'What is the FD interest rate in SBI in 2026?',
      a: 'SBI FD rates in 2026 are approximately 6.8% for 1 year, 7.0% for 2–3 years, and 7.1% for 5 years. Senior citizens get an additional 0.5% interest. Check the SBI website for the latest rates.'
    },
    {
      q: 'Which FD gives the highest interest rate in India?',
      a: 'Small Finance Banks like Unity, Suryoday, and Utkarsh SFB offer the highest FD rates (8.5–9.5%), though they carry slightly higher risk. For safety with good returns, consider HDFC, ICICI or SBI FDs.'
    },
    {
      q: 'Is FD interest taxable in India?',
      a: 'Yes. FD interest is added to your income and taxed as per your income tax slab. Banks deduct TDS at 10% if annual FD interest exceeds ₹40,000 (₹50,000 for senior citizens). Submit Form 15G/15H to avoid TDS if eligible.'
    },
    {
      q: 'What is the difference between quarterly and monthly compounding?',
      a: 'With monthly compounding (12 times/year), interest is calculated and added more frequently, resulting in slightly higher maturity amount than quarterly compounding (4 times/year). Most Indian banks use quarterly compounding for FDs.'
    }
  ];

  constructor() {
    this.title.setTitle('FD Calculator India 2026 – Fixed Deposit Interest Calculator SBI HDFC ICICI');
    this.meta.updateTag({ name: 'description',
      content: 'Free FD Calculator India 2026. Calculate Fixed Deposit maturity amount and interest for SBI, HDFC, ICICI and all banks. Supports quarterly, monthly and yearly compounding.' });
    this.meta.updateTag({ name: 'keywords',
      content: 'fd calculator india 2026, fixed deposit calculator sbi hdfc, fd interest calculator monthly, fd calculator quarterly compounding india' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.myinvestmentcalculator.in/fd-calculator' });
    this.meta.updateTag({ rel: 'canonical', href: 'https://www.myinvestmentcalculator.in/fd-calculator' });
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

  getDonutOffset(principal: number, maturity: number): number {
    return 220 * (principal / maturity);
  }

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? null : index;
  }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { principal, annualRate, years, compoundingFrequency } =
      this.form.getRawValue() as { principal: number; annualRate: number; years: number; compoundingFrequency: number };

    const r = annualRate / 100;
    const n = compoundingFrequency;
    const t = years;
    const maturityAmount = +(principal * Math.pow(1 + r / n, n * t)).toFixed(2);
    const totalInterest  = +(maturityAmount - principal).toFixed(2);

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