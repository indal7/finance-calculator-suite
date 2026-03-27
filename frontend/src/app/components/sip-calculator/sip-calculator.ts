import { Component, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { CalculatorService, SipResult } from '../../services/calculator';

function positiveNumber(min = 0.01) {
  return Validators.compose([Validators.required, Validators.min(min)])!;
}

@Component({
  selector: 'app-sip-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './sip-calculator.html',
  styleUrls: ['./sip-calculator.css']
})
export class SipCalculator implements OnDestroy {
  public router = inject(Router);
  private readonly fb    = inject(FormBuilder);
  private readonly svc   = inject(CalculatorService);
  private readonly title = inject(Title);
  private readonly meta  = inject(Meta);
  private sub?: Subscription;

  form = this.fb.group({
    monthlyInvestment: [5000,  positiveNumber(500)],
    annualRate:        [12,    positiveNumber(1)],
    years:             [10,    positiveNumber(1)]
  });

  result: (SipResult & { localCalc: true }) | null = null;
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';

  openFaq: number | null = null;

copied = false;
private copyTimer?: ReturnType<typeof setTimeout>;

  copyResult(): void {
    if (!this.result) return;
    const { totalInvested, estimatedReturns, totalValue } = this.result;
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const text = [
      `SIP Calculator Result`,
      `Monthly Investment: ₹${monthlyInvestment?.toLocaleString('en-IN')}`,
      `Annual Return: ${annualRate}%`,
      `Period: ${years} years`,
      `─────────────────`,
      `Total Invested:  ₹${totalInvested?.toLocaleString('en-IN')}`,
      `Estimated Gains: ₹${estimatedReturns?.toLocaleString('en-IN')}`,
      `Total Value:     ₹${totalValue?.toLocaleString('en-IN')}`,
      `Calculated at www.myinvestmentcalculator.in`
    ].join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    this.copied = true;
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => { this.copied = false; }, 2200);
  }

  readonly faqs = [
    {
      q: 'What is a good SIP amount to start with in India?',
      a: 'You can start SIP with as low as ₹500/month. A common starting point is ₹1,000–₹5,000/month. The key is consistency — even ₹1,000/month at 12% for 20 years grows to nearly ₹10 lakh.'
    },
    {
      q: 'Is ₹5,000 SIP for 10 years a good investment?',
      a: '₹5,000/month for 10 years at 12% annual return grows to approximately ₹11.6 lakh — nearly double your total investment of ₹6 lakh. It is an excellent way to build wealth through compounding.'
    },
    {
      q: 'Can I stop my SIP anytime?',
      a: 'Yes, most SIPs (especially in open-ended mutual funds) can be paused or stopped anytime without penalty. Your existing units remain invested until you redeem them.'
    },
    {
      q: 'Does this SIP calculator account for inflation?',
      a: 'This calculator shows nominal returns. To adjust for inflation (typically 5–6% in India), reduce the expected annual return by the inflation rate to get the real return.'
    },
    {
      q: 'What is Step-Up SIP?',
      a: 'A Step-Up SIP increases your monthly contribution by a fixed percentage each year. For example, starting at ₹5,000 with a 10% annual step-up means investing ₹5,500 in year 2, ₹6,050 in year 3, and so on — significantly boosting your final corpus.'
    },
    {
      q: 'Which mutual fund category gives the highest SIP returns in India?',
      a: 'Small-cap and mid-cap mutual funds have historically delivered the highest long-term SIP returns (15–20% CAGR over 10+ years), but with higher volatility. Large-cap funds offer more stability at 10–13%. For most investors, a diversified equity fund or flexi-cap fund balances risk and return effectively.'
    },
    {
      q: 'How does rupee cost averaging work in SIP?',
      a: 'When markets fall, your fixed SIP amount buys more mutual fund units at a lower NAV. When markets rise, you buy fewer units at a higher NAV. Over time, this averages your purchase cost per unit — known as rupee cost averaging — reducing the impact of market volatility on your overall portfolio.'
    },
    {
      q: 'What is the minimum period to invest via SIP?',
      a: 'Technically, you can invest in SIP for as short as 6 months. However, to truly benefit from compounding and rupee cost averaging, a minimum of 3–5 years is recommended. For wealth creation goals like retirement or children\'s education, 10–20 year SIPs are ideal.'
    },
    {
      q: 'Is SIP better than a lump sum investment?',
      a: 'SIP is generally better for regular salaried investors who cannot invest a large lump sum at once. It removes the need to time the market and averages out costs. However, if you have a large sum available during a market correction, lump sum investment can outperform SIP over the same period.'
    },
    {
      q: 'How is SIP taxed in India?',
      a: 'Each SIP instalment is treated as a separate investment for tax purposes. For equity mutual funds, gains held less than 12 months are taxed at 20% (Short Term Capital Gains). Gains held for more than 12 months above ₹1.25 lakh per year are taxed at 12.5% (Long Term Capital Gains) from FY 2024–25.'
    }
  ];

  /** Year-by-year SIP projection table */
  getProjectionRows(monthlyInvestment: number | null, annualRate: number | null, totalYears: number | null): Array<{year: number, invested: number, value: number, gains: number}> {
    const mi = monthlyInvestment ?? 0;
    const ar = annualRate ?? 0;
    const ty = totalYears ?? 0;
    const rows = [];
    const r = ar / 100 / 12;
    for (let y = 1; y <= ty; y++) {
      const n = y * 12;
      const fv = r === 0 ? mi * n : mi * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      const invested = +(mi * n).toFixed(0);
      const value = +fv.toFixed(0);
      rows.push({ year: y, invested, value, gains: value - invested });
    }
    return rows;
  }

  constructor() {
    this.title.setTitle('SIP Calculator India – Calculate Monthly SIP Returns Online Free 2026');
    this.meta.updateTag({ name: 'description',
      content: 'Free SIP Calculator India 2026. Calculate returns on ₹1000, ₹5000 or any monthly SIP investment. See how compounding grows your wealth over 5, 10, 20 years.' });
    this.meta.updateTag({ name: 'keywords',
      content: 'sip calculator india free, sip calculator monthly investment india, 5000 sip return in 10 years, sip calculator with inflation india, best sip calculator 2026, sip 1000 per month 20 years' });
    this.meta.updateTag({ property: 'og:title', content: 'SIP Calculator India – Free Online SIP Return Calculator' });
    this.meta.updateTag({ property: 'og:description', content: 'Calculate your SIP returns instantly. Free, accurate, no login required.' });
    this.meta.updateTag({ property: 'og:url', content: 'https://www.myinvestmentcalculator.in/sip-calculator' });
    this.meta.updateTag({ rel: 'canonical', href: 'https://www.myinvestmentcalculator.in/sip-calculator' });
  }

  get f() { return this.form.controls; }

  /** Sync number input → keep slider in sync (just triggers change detection) */
  syncSlider(field: string): void { /* Angular binds [value] reactively */ }

  /** Sync range slider → patch form control value */
  syncFromSlider(field: string, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.form.get(field)?.setValue(val);
  }

  /** Returns 0–100 percentage for slider fill gradient */
  getSliderPct(field: string, min: number, max: number): number {
    const val = this.form.get(field)?.value ?? min;
    return Math.round(((val - min) / (max - min)) * 100);
  }

  /** Returns SVG stroke-dashoffset for donut chart (circumference ≈ 220) */
  getDonutOffset(invested: number, total: number): number {
    const pct = invested / total;
    return 220 * pct;
  }

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? null : index;
  }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { monthlyInvestment, annualRate, years } =
      this.form.getRawValue() as { monthlyInvestment: number; annualRate: number; years: number };

    const r  = annualRate / 100 / 12;
    const n  = years * 12;
    const fv = r === 0
      ? monthlyInvestment * n
      : monthlyInvestment * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);

    const totalInvested    = +(monthlyInvestment * n).toFixed(2);
    const totalValue       = +fv.toFixed(2);
    const estimatedReturns = +(totalValue - totalInvested).toFixed(2);

    this.result = { totalInvested, estimatedReturns, totalValue, localCalc: true };

    this.apiStatus = 'loading';
    this.sub?.unsubscribe();
    this.sub = this.svc.calculateSip({ monthlyInvestment, annualRate, years }).subscribe({
      next:  (res) => { this.result = { ...res, localCalc: true }; this.apiStatus = 'success'; },
      error: (err) => { this.apiError = err.message;              this.apiStatus = 'error';   }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}