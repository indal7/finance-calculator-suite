import { Component, ChangeDetectionStrategy, inject, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';

import { CalculatorService, SipResult } from '../../services/calculator';
import { SeoService } from '../../services/seo.service';
import { BaseCalculator } from '../base-calculator';

function positiveNumber(min = 0.01) {
  return Validators.compose([Validators.required, Validators.min(min)])!;
}

@Component({
  selector: 'app-sip-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './sip-calculator.html',
  styleUrls: ['./sip-calculator.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SipCalculator extends BaseCalculator implements OnInit, OnDestroy {
  public router = inject(Router);
  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(CalculatorService);
  private readonly seo      = inject(SeoService);
  private sub?: Subscription;
  private quickSub?: Subscription;

  @ViewChild('growthChart') growthChartRef!: ElementRef<HTMLCanvasElement>;
  private chartInstance: any = null;

  override form = this.fb.group({
    monthlyInvestment: [5000,  positiveNumber(500)],
    annualRate:        [12,    positiveNumber(1)],
    years:             [10,    positiveNumber(1)]
  });

  result: (SipResult & { localCalc: true }) | null = null;
  quickEstimate: { totalValue: number; totalInvested: number; estimatedReturns: number } | null = null;

  /** Step-Up SIP annual increase percentage */
  stepUpRate = 0;

  /** Cached computed values */
  projectionRows: Array<{year: number; invested: number; value: number; gains: number}> = [];

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
    },
    {
      q: 'How much will ₹1,000 SIP grow in 10 years?',
      a: '₹1,000/month SIP for 10 years at 12% annual return grows to approximately ₹2.32 lakh. Total investment is ₹1.2 lakh and estimated gains are ₹1.12 lakh. At 15% return (mid-cap fund average), the same SIP grows to ₹2.79 lakh.'
    },
    {
      q: 'How to build ₹1 crore with SIP?',
      a: 'To reach ₹1 crore via SIP at 12% annual return, you can invest ₹5,000/month for ~24 years, ₹10,000/month for ~18 years, or ₹15,000/month for ~15 years. A step-up SIP of ₹5,000 with 10% annual increase reaches ₹1 crore in about 16 years.'
    },
    {
      q: 'What is the best SIP for beginners in India 2026?',
      a: 'For beginners, a Nifty 50 Index Fund SIP (e.g., UTI Nifty 50, HDFC Nifty 50) or a large-cap flexi-cap fund is ideal. Start with ₹500–₹2,000/month, commit for at least 5 years, and gradually increase via step-up SIP.'
    },
    {
      q: 'Can I do SIP in stocks directly?',
      a: 'Yes, many brokers like Zerodha, Groww, and Angel One offer stock SIP (also called equity SIP). However, stock SIP lacks the diversification benefit of mutual fund SIP and carries higher risk. For most investors, mutual fund SIP is safer and more convenient.'
    },
    {
      q: 'What happens to SIP if the market crashes?',
      a: 'A market crash is actually beneficial for SIP investors — your fixed monthly amount buys more units at lower prices, reducing your average cost. Historically, investors who continued SIP during the 2008 and 2020 crashes saw excellent returns within 2–3 years of recovery.'
    }
  ];

  /** Year-by-year SIP projection table (supports step-up) */
  getProjectionRows(monthlyInvestment: number | null, annualRate: number | null, totalYears: number | null): Array<{year: number, invested: number, value: number, gains: number}> {
    const mi = monthlyInvestment ?? 0;
    const ar = annualRate ?? 0;
    const ty = totalYears ?? 0;
    const r = ar / 100 / 12;
    const stepUp = this.stepUpRate / 100;
    const rows = [];

    let cumulativeInvested = 0;
    let cumulativeValue = 0;

    for (let y = 1; y <= ty; y++) {
      const currentMonthly = mi * Math.pow(1 + stepUp, y - 1);
      for (let m = 0; m < 12; m++) {
        cumulativeInvested += currentMonthly;
        cumulativeValue = (cumulativeValue + currentMonthly) * (1 + r);
      }
      const invested = +cumulativeInvested.toFixed(0);
      const value = +cumulativeValue.toFixed(0);
      rows.push({ year: y, invested, value, gains: value - invested });
    }
    return rows;
  }

  constructor() {
    super();
    this.seo.setTitle('SIP Calculator India 2026 – Free Mutual Fund SIP Return Calculator Online');
    this.seo.setDescription('Free SIP calculator India 2026. Calculate SIP returns for ₹500, ₹1000, ₹5000/month. See how ₹5000 SIP grows to ₹11.6L in 10 years. Step-up SIP, year-by-year projections & ₹1 crore planning.');
    this.seo.updateOgTags(
      'SIP Calculator India 2026 – Free Online SIP Return Calculator',
      'Calculate your SIP returns instantly. Free, accurate, no login required.',
      'https://www.myinvestmentcalculator.in/'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'SIP Calculator', 'item': 'https://www.myinvestmentcalculator.in/' }
      ]
    }, 'sip-breadcrumb');

    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      'name': 'How to Calculate SIP Returns Online',
      'description': 'Step-by-step guide to calculate your SIP mutual fund returns using our free calculator.',
      'totalTime': 'PT1M',
      'step': [
        { '@type': 'HowToStep', 'position': 1, 'name': 'Enter Monthly Investment', 'text': 'Input the amount you plan to invest every month (e.g., ₹5,000). You can start with as little as ₹500.' },
        { '@type': 'HowToStep', 'position': 2, 'name': 'Enter Expected Return Rate', 'text': 'Enter the expected annual return rate (e.g., 12%). Historical equity mutual fund average is 10–14% p.a.' },
        { '@type': 'HowToStep', 'position': 3, 'name': 'Enter Investment Duration', 'text': 'Select how many years you plan to invest (e.g., 10 years). Longer duration = more compounding benefit.' },
        { '@type': 'HowToStep', 'position': 4, 'name': 'View Your SIP Returns', 'text': 'Click Calculate to see your total invested amount, estimated gains, year-by-year projection and final corpus.' }
      ]
    }, 'sip-howto');
  }

  ngOnInit(): void {
    const pendingShare = this.restoreFromQueryParams();
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/');
    this.seo.updateFAQSchema(this.faqs.map(f => ({ question: f.q, answer: f.a })));
    this.seo.setKeywords([
      'sip calculator', 'sip calculator india', 'sip return calculator',
      'mutual fund sip calculator', 'sip calculator online', 'monthly sip calculator india',
      'sip investment calculator', '₹5000 sip returns', '₹1000 sip returns',
      'step up sip calculator india', 'sip for 1 crore', 'sip calculator with inflation',
      'sbi sip calculator', '5000 sip per month returns', '1000 sip per month returns'
    ]);

    // Reactive quick estimate for hero section (updates on every slider change)
    this.quickSub = this.form.valueChanges
      .pipe(debounceTime(150))
      .subscribe(() => this.updateQuickEstimate());

    // Calculate quick estimate with initial values
    this.updateQuickEstimate();

    // Calculate once with initial values so user sees result on page load
    // Skip if share restore is pending (async callback will calculate)
    if (!pendingShare && this.form.valid) {
      this.calculate();
    }
  }

  /** Returns SVG stroke-dashoffset for donut chart (circumference ≈ 220) */
  getDonutOffset(invested: number, total: number): number {
    const pct = invested / total;
    return 220 * pct;
  }

  /** Set step-up rate and recalculate */
  setStepUp(rate: number): void {
    this.stepUpRate = rate;
    if (this.form.valid) {
      this.calculate();
    }
  }

  /** Lightweight quick estimate for hero section (no chart, no API call) */
  updateQuickEstimate(): void {
    if (this.form.invalid) return;
    const { monthlyInvestment, annualRate, years } =
      this.form.getRawValue() as { monthlyInvestment: number; annualRate: number; years: number };
    const r = annualRate / 100 / 12;
    let totalInvested = 0;
    let totalValue = 0;
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        totalInvested += monthlyInvestment;
        totalValue = (totalValue + monthlyInvestment) * (1 + r);
      }
    }
    totalInvested = +totalInvested.toFixed(2);
    totalValue = +totalValue.toFixed(2);
    this.quickEstimate = { totalValue, totalInvested, estimatedReturns: +(totalValue - totalInvested).toFixed(2) };
    this.cdr.markForCheck();
  }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { monthlyInvestment, annualRate, years } =
      this.form.getRawValue() as { monthlyInvestment: number; annualRate: number; years: number };

    // Calculate with step-up support
    const r = annualRate / 100 / 12;
    const stepUp = this.stepUpRate / 100;
    let totalInvested = 0;
    let totalValue = 0;

    for (let y = 1; y <= years; y++) {
      const currentMonthly = monthlyInvestment * Math.pow(1 + stepUp, y - 1);
      for (let m = 0; m < 12; m++) {
        totalInvested += currentMonthly;
        totalValue = (totalValue + currentMonthly) * (1 + r);
      }
    }

    totalInvested = +totalInvested.toFixed(2);
    totalValue = +totalValue.toFixed(2);
    const estimatedReturns = +(totalValue - totalInvested).toFixed(2);

    this.result = { totalInvested, estimatedReturns, totalValue, localCalc: true };

    // Cache projection rows for the template
    this.projectionRows = this.getProjectionRows(monthlyInvestment, annualRate, years);

    // Trigger change detection for OnPush strategy
    this.cdr.markForCheck();

    // Render growth chart after Angular renders the canvas (inside @if block)
    setTimeout(() => {
      this.renderGrowthChart();
      // Retry if canvas wasn't in DOM yet (e.g. shared-link navigation)
      if (!this.chartInstance) setTimeout(() => this.renderGrowthChart(), 400);
    }, 100);

    this.apiStatus = 'loading';
    this.sub?.unsubscribe();
    this.sub = this.svc.calculateSip({ monthlyInvestment, annualRate, years }).subscribe({
      next:  (res) => { this.result = { ...res, localCalc: true }; this.apiStatus = 'success'; this.cdr.markForCheck(); },
      error: (err) => { this.apiError = err.message;              this.apiStatus = 'error';   this.cdr.markForCheck(); }
    });
  }

  /** Calculates SIP future value with optional step-up */
  private calcSipFV(monthly: number, annualRate: number, years: number, stepUpPct: number = 0): number {
    const r = annualRate / 100 / 12;
    const stepUp = stepUpPct / 100;
    let fv = 0;
    for (let y = 1; y <= years; y++) {
      const currentMonthly = monthly * Math.pow(1 + stepUp, y - 1);
      for (let m = 0; m < 12; m++) {
        fv = (fv + currentMonthly) * (1 + r);
      }
    }
    return fv;
  }

  /** Rows visible in table — 5 by default, all when expanded */
  get displayedRows(): Array<{year: number; invested: number; value: number; gains: number}> {
    return this.showFullTable ? this.projectionRows : this.projectionRows.slice(0, 5);
  }

  /** Smart insights dynamically computed from current result */
  get smartInsights(): Array<{icon: string; text: string}> {
    if (!this.result) return [];
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const insights: Array<{icon: string; text: string}> = [];

    // Insight 1: Increase SIP by ₹500
    const extraFV = this.calcSipFV(monthlyInvestment + 500, annualRate, years, this.stepUpRate);
    const extraGain = Math.round(extraFV - this.result.totalValue);
    insights.push({
      icon: '📈',
      text: `Increase SIP by <strong>₹500</strong> → Gain <strong>₹${this.formatIndian(extraGain)}</strong> extra`
    });

    // Insight 2: Invest 5 more years
    if (years <= 35) {
      const moreFV = this.calcSipFV(monthlyInvestment, annualRate, years + 5, this.stepUpRate);
      const moreGain = Math.round(moreFV - this.result.totalValue);
      insights.push({
        icon: '⏳',
        text: `Investing <strong>5 more years</strong> → +<strong>₹${this.formatIndian(moreGain)}</strong> extra wealth`
      });
    }

    // Insight 3: Power of compounding — last half creates most wealth
    const midPoint = Math.floor(years / 2);
    if (midPoint >= 1) {
      const midFV = this.calcSipFV(monthlyInvestment, annualRate, midPoint, this.stepUpRate);
      const secondHalfPct = Math.round(((this.result.totalValue - midFV) / this.result.totalValue) * 100);
      if (secondHalfPct > 50) {
        insights.push({
          icon: '🚀',
          text: `<strong>${secondHalfPct}%</strong> of your wealth is created in the last half — compounding accelerates over time`
        });
      }
    }

    return insights;
  }

  scrollToCalculator(): void {
    if (this.isBrowser) {
      document.getElementById('sip-calculator')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /** Set monthly investment preset amount */
  setPreset(amount: number): void {
    this.form.patchValue({ monthlyInvestment: amount });
    if (this.form.valid) {
      this.calculate();
    }
  }

  override scrollToResult(): void {
    this.calculate();
    if (this.isBrowser) {
      setTimeout(() => {
        const el = document.getElementById('result-panel');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  downloadSipCSV(): void {
    if (!this.projectionRows.length) return;
    const rows = this.projectionRows.map(r => ({
      Year: r.year,
      'Total Invested (₹)': r.invested,
      'Est. Gains (₹)': r.gains,
      'Total Value (₹)': r.value
    }));
    this.downloadCSV(rows, 'sip-projection');
  }

  getSharePayload() {
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const inputs: Record<string, number> = { monthlyInvestment, annualRate, years };
    if (this.stepUpRate > 0) {
      inputs['stepUpRate'] = this.stepUpRate;
    }
    return { calculator: 'sip' as const, inputs };
  }

  override restoreExtraInputs(inputs: Record<string, number>): void {
    if (inputs['stepUpRate'] !== undefined) {
      const rate = typeof inputs['stepUpRate'] === 'number'
        ? inputs['stepUpRate']
        : parseFloat(inputs['stepUpRate'] as any);
      if (!isNaN(rate) && isFinite(rate) && rate >= 0) {
        this.stepUpRate = rate;
      }
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.quickSub?.unsubscribe();
    this.seo.removeJsonLd('sip-breadcrumb');
    this.seo.removeJsonLd('sip-howto');
    this.seo.removeFAQSchema();
    this.chartInstance?.destroy();
  }

  /** Render or update the SIP growth stacked bar chart */
  renderGrowthChart(): void {
    if (!this.isBrowser || !this.growthChartRef?.nativeElement || !this.projectionRows.length) return;

    import('../../services/chart-setup').then(({ registerChartComponents }) => {
      const Chart = registerChartComponents();

      const labels = this.projectionRows.map(r => `Yr ${r.year}`);
      const investedData = this.projectionRows.map(r => r.invested);
      const returnsData = this.projectionRows.map(r => r.gains);

      // Destroy previous chart to rebuild
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }

      const ctx = this.growthChartRef.nativeElement.getContext('2d');
      if (!ctx) return;

      this.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Invested',
              data: investedData,
              backgroundColor: '#dee2e6',
              borderRadius: 2,
              barPercentage: 0.7,
              categoryPercentage: 0.8
            },
            {
              label: 'Returns',
              data: returnsData,
              backgroundColor: '#00B386',
              borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
              barPercentage: 0.7,
              categoryPercentage: 0.8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          scales: {
            x: {
              stacked: true,
              ticks: { color: '#6c757d', font: { size: 11 } },
              grid: { display: false }
            },
            y: {
              stacked: true,
              ticks: {
                color: '#6c757d',
                font: { size: 11 },
                callback: (val: any) => '₹' + (val >= 10000000 ? (val / 10000000).toFixed(2) + 'Cr' : val >= 100000 ? (val / 100000).toFixed(1) + 'L' : (val / 1000).toFixed(0) + 'K')
              },
              grid: { color: 'rgba(0,0,0,0.05)' }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1a2e',
              titleColor: '#ffffff',
              bodyColor: '#ced4da',
              borderColor: 'rgba(0,179,134,0.3)',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: (ctx: any) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`,
                afterBody: (items: any[]) => {
                  if (!items.length) return '';
                  const idx = items[0].dataIndex;
                  const total = investedData[idx] + returnsData[idx];
                  return `Total: ₹${total.toLocaleString('en-IN')}`;
                }
              }
            }
          }
        }
      });
    });
  }
}