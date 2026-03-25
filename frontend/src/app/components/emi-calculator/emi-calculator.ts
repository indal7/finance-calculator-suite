import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { CalculatorService, EmiResult } from '../../services/calculator';

@Component({
  selector: 'app-emi-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './emi-calculator.html',
  styleUrls: ['./emi-calculator.css']
})
export class EmiCalculator implements OnDestroy {
  private readonly fb    = inject(FormBuilder);
  private readonly svc   = inject(CalculatorService);
  private readonly title = inject(Title);
  private readonly meta  = inject(Meta);
  private sub?: Subscription;

  form = this.fb.group({
    principal:  [500000, [Validators.required, Validators.min(1)]],
    annualRate: [8.5,    [Validators.required, Validators.min(0.01)]],
    years:      [5,      [Validators.required, Validators.min(1)]]
  });

  result: (EmiResult & { localCalc: true }) | null = null;
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';
  openFaq: number | null = null;

  readonly faqs = [
    {
      q: 'What is the EMI for a ₹10 lakh loan for 5 years at 10%?',
      a: 'For a ₹10,00,000 loan at 10% annual interest for 5 years, your monthly EMI would be approximately ₹21,247. Total interest paid would be around ₹2,74,826.'
    },
    {
      q: 'Does prepayment reduce EMI or tenure?',
      a: 'Most Indian banks allow you to choose. Reducing tenure saves more interest overall (recommended). Reducing EMI gives you more monthly cash flow. Always check your loan agreement for prepayment charges.'
    },
    {
      q: 'How is home loan EMI different from personal loan EMI?',
      a: 'The formula is the same, but home loan rates (8–10%) are lower than personal loan rates (11–18%), and tenure is much longer (up to 30 years vs 5 years). Home loans also offer tax benefits under Section 80C and Section 24.'
    },
    {
      q: 'What is the maximum loan I can get based on my salary?',
      a: 'Most Indian banks limit your total EMI outgo to 40–50% of your net monthly salary. So if you earn ₹50,000/month, you can typically afford EMIs up to ₹20,000–₹25,000/month.'
    }
  ];

  constructor() {
    this.title.setTitle('EMI Calculator India – Home Loan, Car Loan EMI Calculator Online Free 2026');
    this.meta.updateTag({ name: 'description',
      content: 'Free EMI Calculator India 2026. Calculate home loan, car loan or personal loan EMI instantly. See monthly EMI, total interest and payment breakdown.' });
    this.meta.updateTag({ name: 'keywords',
      content: 'emi calculator india online free, home loan emi calculator india, car loan emi calculator india, emi calculator with prepayment, 10 lakh loan 5 years emi' });
    this.meta.updateTag({ property: 'og:title', content: 'EMI Calculator India – Free Loan EMI Calculator' });
    this.meta.updateTag({ property: 'og:description', content: 'Calculate your monthly EMI for home, car or personal loans. Free and instant.' });
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

  getDonutOffset(principal: number | null, total: number | null): number {
    const safePrincipal = principal ?? 0;
    const safeTotal = total ?? 0;

    if (safeTotal <= 0) return 0;

    return 220 * (safePrincipal / safeTotal);
  }

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? null : index;
  }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { principal, annualRate, years } =
      this.form.getRawValue() as { principal: number; annualRate: number; years: number };

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