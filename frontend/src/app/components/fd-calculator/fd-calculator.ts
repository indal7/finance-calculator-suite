import { Component, inject, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';

import { CalculatorService, FdResult } from '../../services/calculator';
import { SeoService } from '../../services/seo.service';
import { BaseCalculator } from '../base-calculator';

@Component({
  selector: 'app-fd-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, DecimalPipe],
  templateUrl: './fd-calculator.html',
  styleUrls: ['./fd-calculator.css']
})
export class FdCalculator extends BaseCalculator implements OnInit, OnDestroy {
  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(CalculatorService);
  private readonly seo      = inject(SeoService);
  private sub?: Subscription;
  private calcSub?: Subscription;

  @ViewChild('fdGrowthChart') fdGrowthChartRef!: ElementRef<HTMLCanvasElement>;
  private chartInstance: any = null;
  fdProjectionCache: Array<{year: number; interest: number; maturity: number}> = [];

  override form = this.fb.group({
    principal:            [100000, [Validators.required, Validators.min(1)]],
    annualRate:           [7,      [Validators.required, Validators.min(0.01)]],
    years:                [3,      [Validators.required, Validators.min(0.08)]],
    compoundingFrequency: [4,      [Validators.required, Validators.min(1)]]
  });

  result: (FdResult & { localCalc: true }) | null = null;

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

  /** Rows visible in table — 5 by default, all when expanded */
  get displayedRows(): Array<{year: number, interest: number, maturity: number}> {
    return this.showFullTable ? this.fdProjectionCache : this.fdProjectionCache.slice(0, 5);
  }

  /** Smart insights dynamically computed from current result */
  get smartInsights(): Array<{icon: string; text: string}> {
    if (!this.result) return [];
    const { principal, annualRate, years, compoundingFrequency } = this.form.getRawValue() as any;
    const insights: Array<{icon: string; text: string}> = [];

    // Insight 1: Effective yield vs nominal rate
    const effectiveYield = ((this.result.totalInterest / principal) * 100 / years).toFixed(1);
    insights.push({
      icon: '💰',
      text: `Your effective yearly yield is <strong>${effectiveYield}%</strong> with ${compoundingFrequency === 12 ? 'monthly' : compoundingFrequency === 4 ? 'quarterly' : compoundingFrequency === 2 ? 'half-yearly' : 'annual'} compounding`
    });

    // Insight 2: Senior citizen benefit
    const seniorRate = annualRate + 0.5;
    const seniorMaturity = Math.round(principal * Math.pow(1 + seniorRate / 100 / compoundingFrequency, compoundingFrequency * years));
    const extraEarnings = seniorMaturity - this.result.maturityAmount;
    insights.push({
      icon: '👴',
      text: `Senior citizens earn <strong>\u20b9${this.formatIndian(extraEarnings)}</strong> extra with +0.5% rate benefit`
    });

    // Insight 3: Double your money
    const doublingYears = (Math.log(2) / Math.log(1 + annualRate / 100 / compoundingFrequency) / compoundingFrequency).toFixed(1);
    insights.push({
      icon: '🚀',
      text: `At <strong>${annualRate}%</strong>, your money doubles in approximately <strong>${doublingYears} years</strong>`
    });

    return insights;
  }

  constructor() {
    super();
    this.seo.setTitle('FD Calculator India 2026 – SBI, HDFC, ICICI Fixed Deposit Return Calculator');
    this.seo.setDescription('Free FD calculator India 2026. Calculate fixed deposit maturity amount & interest for SBI, HDFC, ICICI, PNB. ₹10 lakh FD earns ₹5,833/month at 7%. Senior citizen rates included.');
    this.seo.updateOgTags(
      'FD Calculator India 2026 – Free Fixed Deposit Calculator Online',
      'Calculate your FD maturity amount instantly. Compare SBI, HDFC, ICICI rates. Free, accurate, no login required.',
      'https://www.myinvestmentcalculator.in/fd-calculator'
    );
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
    const pendingShare = this.restoreFromQueryParams();
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/fd-calculator');
    this.seo.setKeywords([
      'fd calculator india', 'fixed deposit calculator', 'fd calculator online',
      'sbi fd calculator 2026', 'hdfc fd calculator', 'fd interest calculator',
      'fd maturity calculator', '10 lakh fd interest per month',
      'senior citizen fd rates 2026', 'post office fd calculator'
    ]);
    this.seo.updateFAQSchema(this.faqs.map(f => ({ question: f.q, answer: f.a })));

    // ── REACTIVE CALCULATION: Auto-calculate on form value changes ──
    this.calcSub = this.form.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => this.calculate());

    // Calculate once with initial values so user sees result immediately
    if (!pendingShare && this.form.valid) {
      this.calculate();
    }
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

    // Cache projection rows and render chart
    if (years >= 1) {
      this.fdProjectionCache = this.getFdProjectionRows(principal, annualRate, years, compoundingFrequency);
      setTimeout(() => {
        this.renderGrowthChart();
        if (!this.chartInstance) setTimeout(() => this.renderGrowthChart(), 400);
      }, 100);
    }
    // Trigger change detection for OnPush strategy
    this.cdr.markForCheck();

    this.apiStatus = 'loading';
    this.sub?.unsubscribe();
    this.sub = this.svc.calculateFd({ principal, annualRate, years, compoundingFrequency }).subscribe({
      next:  (res) => { this.result = { ...res, localCalc: true }; this.apiStatus = 'success'; this.cdr.markForCheck(); },
      error: (err) => { this.apiError = err.message;              this.apiStatus = 'error';   this.cdr.markForCheck(); }
    });
  }

  downloadFdCSV(): void {
    this.downloadCSV(
      this.fdProjectionCache.map(r => ({ 'Year': r.year, 'Interest Earned (₹)': r.interest, 'Maturity Value (₹)': r.maturity })),
      'fd-projection.csv'
    );
  }

  getSharePayload() {
    const v = this.form.getRawValue();
    return { calculator: 'fd' as const, inputs: { principal: v.principal!, annualRate: v.annualRate!, years: v.years!, compoundingFrequency: v.compoundingFrequency! } };
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.calcSub?.unsubscribe();
    this.seo.removeJsonLd('fd-breadcrumb');
    this.seo.removeFAQSchema();
    this.chartInstance?.destroy();
  }

  /** Render or update the FD growth line chart */
  renderGrowthChart(): void {
    if (!this.isBrowser || !this.fdGrowthChartRef?.nativeElement || !this.fdProjectionCache.length) return;

    import('../../services/chart-setup').then(({ registerChartComponents }) => {
      const Chart = registerChartComponents();

      const labels = this.fdProjectionCache.map(r => `Year ${r.year}`);
      const principalLine = this.fdProjectionCache.map(() => this.result?.principal ?? 0);
      const maturityData = this.fdProjectionCache.map(r => r.maturity);

      if (this.chartInstance) {
        this.chartInstance.data.labels = labels;
        this.chartInstance.data.datasets[0].data = principalLine;
        this.chartInstance.data.datasets[1].data = maturityData;
        this.chartInstance.update('none');
        return;
      }

      const ctx = this.fdGrowthChartRef.nativeElement.getContext('2d');
      if (!ctx) return;

      const investedGrad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
      investedGrad.addColorStop(0, 'rgba(173,181,189,0.18)');
      investedGrad.addColorStop(1, 'rgba(173,181,189,0.01)');

      const valueGrad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
      valueGrad.addColorStop(0, 'rgba(245,166,35,0.25)');
      valueGrad.addColorStop(0.7, 'rgba(245,166,35,0.06)');
      valueGrad.addColorStop(1, 'rgba(245,166,35,0.0)');

      this.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Principal',
              data: principalLine,
              borderColor: 'rgba(173,181,189,0.8)',
              backgroundColor: investedGrad,
              borderWidth: 2,
              fill: true,
              tension: 0,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#adb5bd',
              borderDash: [6, 3]
            },
            {
              label: 'Maturity Value',
              data: maturityData,
              borderColor: '#F5A623',
              backgroundColor: valueGrad,
              borderWidth: 2.5,
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#F5A623'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: {
              labels: { color: '#6c757d', font: { size: 12 }, usePointStyle: true, pointStyle: 'circle' }
            },
            tooltip: {
              backgroundColor: '#1a1a2e',
              titleColor: '#ffffff',
              bodyColor: '#ced4da',
              borderColor: 'rgba(245,166,35,0.3)',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: (ctx: any) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`,
                afterBody: (items: any[]) => {
                  if (!items.length) return '';
                  const idx = items[0].dataIndex;
                  const interest = maturityData[idx] - (this.result?.principal ?? 0);
                  return `Interest Earned: ₹${interest.toLocaleString('en-IN')}`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#6c757d', font: { size: 11 } },
              grid: { color: 'rgba(0,0,0,0.05)' }
            },
            y: {
              ticks: {
                color: '#6c757d',
                font: { size: 11 },
                callback: (val: any) => '₹' + (val >= 10000000 ? (val / 10000000).toFixed(1) + 'Cr' : val >= 100000 ? (val / 100000).toFixed(1) + 'L' : (val / 1000).toFixed(0) + 'K')
              },
              grid: { color: 'rgba(0,0,0,0.05)' }
            }
          }
        }
      });
    });
  }
}
