import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { CalculatorService, CagrResult } from '../../services/calculator';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-cagr-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './cagr-calculator.html',
  styleUrls: ['./cagr-calculator.css']
})
export class CagrCalculator implements OnInit, OnDestroy {
  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(CalculatorService);
  private readonly seo      = inject(SeoService);
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

  copied = false;
  private copyTimer?: ReturnType<typeof setTimeout>;

  copyResult(): void {
    if (!this.result) return;
    const { cagr, absoluteReturn, totalGain } = this.result;
    const { beginningValue, endingValue, years } = this.form.getRawValue() as any;
    const text = [
      `CAGR Calculator Result`,
      `Beginning Value: ₹${beginningValue?.toLocaleString('en-IN')}`,
      `Ending Value:    ₹${endingValue?.toLocaleString('en-IN')}`,
      `Period: ${years} years`,
      `─────────────────`,
      `CAGR:            ${cagr?.toFixed(2)}%`,
      `Absolute Return: ${absoluteReturn?.toFixed(2)}%`,
      `Total Gain:      ₹${totalGain?.toLocaleString('en-IN')}`,
      `Calculated at www.myinvestmentcalculator.in`
    ].join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    this.copied = true;
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => { this.copied = false; }, 2200);
  }

  /** Year-by-year CAGR growth projection */
  getCagrProjectionRows(
    beginningValue: number | null,
    endingValue: number | null,
    totalYears: number | null
  ): Array<{ year: number; value: number; gain: number }> {
    const bv = beginningValue ?? 0;
    const ev = endingValue ?? 0;
    const ty = totalYears ?? 0;
    if (bv <= 0 || ev <= 0 || ty <= 0) return [];
    const annualRate = Math.pow(ev / bv, 1 / ty) - 1;
    const rows = [];
    for (let y = 1; y <= Math.ceil(ty); y++) {
      const t = Math.min(y, ty);
      const value = Math.round(bv * Math.pow(1 + annualRate, t));
      rows.push({ year: y, value, gain: value - bv });
    }
    return rows;
  }

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
    },
    {
      q: 'How do I use CAGR to compare two investments?',
      a: 'CAGR is the perfect tool for comparing investments of different time periods. If Investment A grew from ₹1 lakh to ₹2 lakh in 5 years (CAGR: 14.87%) and Investment B grew from ₹1 lakh to ₹3 lakh in 10 years (CAGR: 11.61%), Investment A actually performed better on an annualised basis despite a lower absolute return.'
    },
    {
      q: 'What is the CAGR formula?',
      a: 'CAGR = (Ending Value / Beginning Value)^(1/n) − 1, where n = number of years. For example, ₹50,000 growing to ₹1,00,000 in 5 years: CAGR = (1,00,000/50,000)^(1/5) − 1 = 2^0.2 − 1 = 14.87%.'
    },
    {
      q: 'What is the difference between CAGR and IRR?',
      a: 'CAGR measures the smoothed annual growth rate of a single investment from start to end. IRR (Internal Rate of Return) is more comprehensive — it accounts for multiple cash flows (like SIP investments) at different time periods. For a single lump sum investment, CAGR and IRR are equivalent.'
    },
    {
      q: 'What CAGR should I expect from real estate in India?',
      a: 'Indian real estate has historically delivered 7–12% CAGR in major cities over the long term, varying significantly by location. Prime locations in Mumbai, Delhi, and Bangalore have seen 10–15% CAGR over 15–20 years. However, real estate has lower liquidity and requires higher capital compared to mutual funds.'
    },
    {
      q: 'How is CAGR used in business performance analysis?',
      a: 'Businesses use CAGR to measure revenue growth, profit growth, and market share expansion over multiple years. A company with 20%+ revenue CAGR over 5 years is considered a high-growth company. CAGR is also used in business valuations and investor presentations.'
    },
    {
      q: 'What is the historical CAGR of gold in India?',
      a: 'Gold has delivered approximately 10–12% CAGR in India over the last 20 years (2004–2024) in INR terms, partly due to currency depreciation. However, gold does not generate income and has longer periods of underperformance compared to equity markets.'
    }
  ];

  constructor() {
    this.seo.setTitle('CAGR Calculator India – Stock Return & Annual Growth Rate Calculator 2026');
    this.seo.setDescription('Free CAGR Calculator India. Calculate the compound annual growth rate for stocks, mutual funds, real estate and more. Compare your returns with Nifty 50 benchmarks.');
    this.seo.updateOgTags(
      'CAGR Calculator India – Free Annual Growth Rate Calculator',
      'Calculate your investment CAGR instantly. Free, accurate, no login required.',
      'https://www.myinvestmentcalculator.in/cagr-calculator'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': 'CAGR Calculator India',
      'url': 'https://www.myinvestmentcalculator.in/cagr-calculator',
      'description': 'Free CAGR Calculator India 2026. Calculate Compound Annual Growth Rate for stocks, mutual funds and portfolios.',
      'applicationCategory': 'FinanceApplication',
      'operatingSystem': 'Any',
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'INR' },
      'inLanguage': 'en-IN'
    }, 'cagr-webapp');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [
        { '@type': 'Question', 'name': 'What is CAGR?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'CAGR (Compound Annual Growth Rate) is the mean annual growth rate of an investment over a specified period. It represents the rate at which an investment would have grown if it grew at a steady rate annually.' } },
        { '@type': 'Question', 'name': 'What is a good CAGR for mutual funds in India?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'A CAGR of 12–15% is considered good for equity mutual funds in India over a long-term horizon (10+ years). Large-cap funds typically deliver 10–13%, while mid-cap and small-cap funds may deliver 14–18%.' } },
        { '@type': 'Question', 'name': 'What is the CAGR formula?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'CAGR = (Ending Value / Beginning Value)^(1/n) − 1, where n = number of years. For example, ₹50,000 growing to ₹1,00,000 in 5 years gives a CAGR of 14.87%.' } },
        { '@type': 'Question', 'name': 'What is the CAGR of Nifty 50?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Nifty 50 has delivered approximately 12–13% CAGR over the last 20 years (2004–2024).' } },
        { '@type': 'Question', 'name': 'Can CAGR be negative?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes. If your ending value is less than your beginning value, CAGR will be negative, indicating capital erosion.' } }
      ]
    }, 'cagr-faq');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'CAGR Calculator', 'item': 'https://www.myinvestmentcalculator.in/cagr-calculator' }
      ]
    }, 'cagr-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/cagr-calculator');
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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.seo.removeJsonLd('cagr-webapp');
    this.seo.removeJsonLd('cagr-faq');
    this.seo.removeJsonLd('cagr-breadcrumb');
  }
}