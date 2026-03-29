import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { CalculatorService, FdResult } from '../../services/calculator';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-fd-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './fd-calculator.html',
  styleUrls: ['./fd-calculator.css']
})
export class FdCalculator implements OnInit, OnDestroy {
  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(CalculatorService);
  private readonly seo      = inject(SeoService);
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

  copied = false;
  private copyTimer?: ReturnType<typeof setTimeout>;

  copyResult(): void {
    if (!this.result) return;
    const { principal, maturityAmount, totalInterest } = this.result;
    const { annualRate, years, compoundingFrequency } = this.form.getRawValue() as any;
    const freqLabel = this.frequencies.find(f => f.value === compoundingFrequency)?.label ?? compoundingFrequency;
    const text = [
      `FD Calculator Result`,
      `Principal: ₹${principal?.toLocaleString('en-IN')}`,
      `Annual Rate: ${annualRate}%`,
      `Tenure: ${years} years`,
      `Compounding: ${freqLabel}`,
      `─────────────────`,
      `Maturity Amount: ₹${maturityAmount?.toLocaleString('en-IN')}`,
      `Total Interest:  ₹${totalInterest?.toLocaleString('en-IN')}`,
      `Calculated at www.myinvestmentcalculator.in`
    ].join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    this.copied = true;
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => { this.copied = false; }, 2200);
  }

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
    },
    {
      q: 'What is the maximum DICGC insurance cover for FD in India?',
      a: 'The Deposit Insurance and Credit Guarantee Corporation (DICGC) insures bank deposits up to ₹5 lakh per depositor per bank. This includes all deposits (savings, FD, RD) across all branches of the same bank. To protect more, spread deposits across multiple banks.'
    },
    {
      q: 'Can I break my FD prematurely?',
      a: 'Yes, most bank FDs can be broken prematurely, but a penalty of 0.5%–1% is typically deducted from the applicable interest rate. Some banks offer penalty-free premature withdrawal after a lock-in period. Tax-saving FDs (5-year) cannot be broken before maturity.'
    },
    {
      q: 'What is the FD interest rate for senior citizens in India 2026?',
      a: 'Senior citizens (age 60+) get an additional 0.25%–0.50% interest on FDs at most banks. SBI Wecare scheme offers 0.50% extra for senior citizens on deposits of 5 years and above. HDFC, ICICI and other private banks also offer similar senior citizen benefits.'
    },
    {
      q: 'Is FD better than SIP in India?',
      a: 'FD offers guaranteed returns (6–9%) with zero market risk — ideal for conservative investors or short-term goals. SIP in equity mutual funds offers potentially higher returns (10–15% historically) but with market volatility. For long-term wealth creation (10+ years), SIP typically outperforms FD. For capital preservation or goals within 1–3 years, FD is safer.'
    },
    {
      q: 'What is a Tax-Saving FD (Section 80C)?',
      a: 'A Tax-Saving FD has a mandatory 5-year lock-in period and qualifies for deduction up to ₹1.5 lakh/year under Section 80C of the Income Tax Act. Interest earned is fully taxable. Most major banks offer this at the same rates as regular 5-year FDs.'
    },
    {
      q: 'How to calculate FD maturity amount manually?',
      a: 'Use the formula: A = P × (1 + r/n)^(n×t), where P = principal, r = annual interest rate (decimal), n = compounding frequency (4 for quarterly), t = years. For example: ₹1,00,000 at 7% for 3 years with quarterly compounding = 1,00,000 × (1 + 0.07/4)^(4×3) = ₹1,23,145.'
    }
  ];

  /** Year-by-year FD growth projection */
  getFdProjectionRows(principal: number | null, annualRate: number | null, totalYears: number | null, compFreq: number | null): Array<{year: number, interest: number, maturity: number}> {
    const p = principal ?? 0;
    const ar = annualRate ?? 0;
    const ty = totalYears ?? 0;
    const n = compFreq ?? 4;
    const rows = [];
    const r = ar / 100;
    for (let y = 1; y <= Math.ceil(ty); y++) {
      const t = Math.min(y, ty);
      const maturity = +(p * Math.pow(1 + r / n, n * t)).toFixed(0);
      rows.push({ year: y, interest: maturity - p, maturity });
    }
    return rows;
  }

  constructor() {
    this.seo.setTitle('FD Calculator India 2026 – Fixed Deposit Interest Calculator SBI HDFC ICICI');
    this.seo.setDescription('Free FD Calculator India 2026. Calculate Fixed Deposit maturity amount with monthly, quarterly, or yearly compounding. Compare SBI, HDFC, ICICI FD rates.');
    this.seo.updateOgTags(
      'FD Calculator India – Free Fixed Deposit Calculator Online',
      'Calculate your FD maturity amount instantly. Free, accurate, no login required.',
      'https://www.myinvestmentcalculator.in/fd-calculator'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': 'FD Calculator India',
      'url': 'https://www.myinvestmentcalculator.in/fd-calculator',
      'description': 'Free FD Calculator India 2026. Calculate Fixed Deposit maturity amount for SBI, HDFC, ICICI with quarterly and monthly compounding.',
      'applicationCategory': 'FinanceApplication',
      'operatingSystem': 'Any',
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'INR' },
      'inLanguage': 'en-IN'
    }, 'fd-webapp');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [
        { '@type': 'Question', 'name': 'What is an FD calculator?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'An FD calculator is a free tool that calculates Fixed Deposit maturity amount based on principal, interest rate, duration, and compounding frequency. It shows you total interest earned and final maturity value.' } },
        { '@type': 'Question', 'name': 'What is the FD interest rate in SBI in 2026?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'SBI FD rates in 2026 are approximately 6.8% for 1 year, 7.0% for 2–3 years, and 7.1% for 5 years. Senior citizens get an additional 0.5% interest.' } },
        { '@type': 'Question', 'name': 'Is FD interest taxable in India?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes. FD interest is taxed as per your income tax slab. Banks deduct TDS at 10% if annual FD interest exceeds ₹40,000. Submit Form 15G/15H to avoid TDS if eligible.' } },
        { '@type': 'Question', 'name': 'Which FD gives the highest interest rate in India?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Small Finance Banks like Unity, Suryoday, and Utkarsh SFB offer the highest FD rates (8.5–9.5%). For safety, consider HDFC, ICICI or SBI FDs.' } },
        { '@type': 'Question', 'name': 'Is FD better than SIP in India?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'FD offers guaranteed returns (6–9%) with zero market risk — ideal for conservative investors or short-term goals. SIP in equity mutual funds offers potentially higher returns (10–15%) for long-term wealth creation.' } }
      ]
    }, 'fd-faq');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'FD Calculator', 'item': 'https://www.myinvestmentcalculator.in/fd-calculator' }
      ]
    }, 'fd-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/fd-calculator');
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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.seo.removeJsonLd('fd-webapp');
    this.seo.removeJsonLd('fd-faq');
    this.seo.removeJsonLd('fd-breadcrumb');
  }
}