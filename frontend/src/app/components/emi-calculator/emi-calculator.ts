import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { CalculatorService, EmiResult } from '../../services/calculator';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-emi-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './emi-calculator.html',
  styleUrls: ['./emi-calculator.css']
})
export class EmiCalculator implements OnInit, OnDestroy {
  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(CalculatorService);
  private readonly seo      = inject(SeoService);
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

  copied = false;
  private copyTimer?: ReturnType<typeof setTimeout>;

  copyResult(): void {
    if (!this.result) return;
    const { emi, totalPayment, totalInterest } = this.result;
    const { principal, annualRate, years } = this.form.getRawValue() as any;
    const text = [
      `EMI Calculator Result`,
      `Loan Amount: ₹${principal?.toLocaleString('en-IN')}`,
      `Annual Interest: ${annualRate}%`,
      `Tenure: ${years} years`,
      `─────────────────`,
      `Monthly EMI:    ₹${emi?.toLocaleString('en-IN')}`,
      `Total Payment:  ₹${totalPayment?.toLocaleString('en-IN')}`,
      `Total Interest: ₹${totalInterest?.toLocaleString('en-IN')}`,
      `Calculated at www.myinvestmentcalculator.in`
    ].join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    this.copied = true;
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => { this.copied = false; }, 2200);
  }

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
    },
    {
      q: 'What is the current home loan interest rate in India 2026?',
      a: 'Home loan interest rates in India in 2026 range from 8.40% to 9.50% p.a. for salaried individuals. SBI home loans start at 8.50%, HDFC at 8.70%, and ICICI Bank at 8.75%. Rates vary based on your credit score, loan amount, and loan tenure.'
    },
    {
      q: 'How does EMI change with a longer loan tenure?',
      a: 'Increasing your loan tenure reduces the monthly EMI but significantly increases the total interest paid. For example, a ₹30 lakh home loan at 9% for 10 years has an EMI of ₹38,002 (total interest ₹15.6L), while the same loan for 20 years has an EMI of ₹26,992 (total interest ₹34.8L). Choose tenure based on your monthly budget and long-term financial goals.'
    },
    {
      q: 'Is it better to take a longer tenure home loan and invest the EMI difference?',
      a: 'This strategy works if your investments earn more than your loan interest rate. For a home loan at 8.5%, if you invest the monthly EMI savings in equity SIP at 12%, you may come out ahead over 20 years. However, this requires discipline and market-linked returns are not guaranteed.'
    },
    {
      q: 'What is a floating vs fixed interest rate for EMI?',
      a: 'Fixed rate EMIs remain constant throughout the loan tenure, offering predictability. Floating rate EMIs change with the RBI repo rate — when rates fall, your EMI decreases (and vice versa). In India, most home loans are at floating rates linked to external benchmarks (EBLR or MCLR).'
    },
    {
      q: 'How is car loan EMI calculated in India?',
      a: 'Car loan EMI uses the same formula: EMI = P × r × (1+r)ⁿ / ((1+r)ⁿ − 1). Car loans in India typically range from 9% to 12% at tenures of 1–7 years. For example, a ₹8 lakh car loan at 10% for 5 years = monthly EMI of ₹16,997.'
    },
    {
      q: 'Can I get a tax benefit on EMI payments?',
      a: 'Yes, for home loans: principal repayment qualifies for deduction up to ₹1.5 lakh/year under Section 80C, and interest paid is deductible up to ₹2 lakh/year under Section 24(b) for self-occupied property. Personal loan and car loan EMIs do not get tax benefits, though business loans may.'
    }
  ];

  /** Amortization schedule: year-end principal remaining and interest paid per year */
  getAmortizationRows(principal: number | null, annualRate: number | null, years: number | null): Array<{year: number, emi: number, principalPaid: number, interestPaid: number, balance: number}> {
    const p = principal ?? 0;
    const ar = annualRate ?? 0;
    const y = years ?? 0;
    const r = ar / 100 / 12;
    const n = y * 12;
    const emi = r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const rows = [];
    let balance = p;
    for (let yr = 1; yr <= y; yr++) {
      let yearInterest = 0;
      let yearPrincipal = 0;
      for (let m = 1; m <= 12; m++) {
        const interestForMonth = balance * r;
        const principalForMonth = emi - interestForMonth;
        yearInterest += interestForMonth;
        yearPrincipal += principalForMonth;
        balance = Math.max(0, balance - principalForMonth);
      }
      rows.push({ year: yr, emi: +emi.toFixed(0), principalPaid: +yearPrincipal.toFixed(0), interestPaid: +yearInterest.toFixed(0), balance: +balance.toFixed(0) });
    }
    return rows;
  }

  constructor() {
    this.seo.setTitle('EMI Calculator India 2026 – Home & Car Loan EMI');
    this.seo.setDescription('Free EMI Calculator India. Calculate monthly EMI for home loan, car loan, personal loan. Get complete interest breakdown and amortization schedule.');
    this.seo.updateOgTags(
      'EMI Calculator India – Free Loan EMI Calculator Online',
      'Calculate your loan EMI instantly. Full amortization schedule. Free, accurate, no login required.',
      'https://www.myinvestmentcalculator.in/emi-calculator'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'EMI Calculator', 'item': 'https://www.myinvestmentcalculator.in/emi-calculator' }
      ]
    }, 'emi-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/emi-calculator');
    this.seo.setKeywords([
      'emi calculator india', 'home loan emi calculator',
      'car loan emi calculator', 'personal loan emi calculator',
      'emi calculator with amortization', 'loan emi calculator 2026'
    ]);
    this.seo.updateFAQSchema(this.faqs.map(f => ({ question: f.q, answer: f.a })));
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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.seo.removeJsonLd('emi-breadcrumb');
    this.seo.removeFAQSchema();
  }
}