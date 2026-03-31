import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, OnDestroy, OnInit, ViewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';

import { CalculatorService, SipResult } from '../../services/calculator';
import { SeoService } from '../../services/seo.service';

function positiveNumber(min = 0.01) {
  return Validators.compose([Validators.required, Validators.min(min)])!;
}

@Component({
  selector: 'app-sip-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DecimalPipe, RouterLink],
  templateUrl: './sip-calculator.html',
  styleUrls: ['./sip-calculator.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SipCalculator implements OnInit, OnDestroy {
  public router = inject(Router);
  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(CalculatorService);
  private readonly seo      = inject(SeoService);
  private readonly cdr      = inject(ChangeDetectorRef);
  private sub?: Subscription;
  private calcSub?: Subscription;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @ViewChild('growthChart') growthChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutChart') doughnutChartRef!: ElementRef<HTMLCanvasElement>;
  private chartInstance: any = null;
  private doughnutChartInstance: any = null;

  form = this.fb.group({
    monthlyInvestment: [5000,  positiveNumber(500)],
    annualRate:        [12,    positiveNumber(1)],
    years:             [10,    positiveNumber(1)]
  });

  result: (SipResult & { localCalc: true }) | null = null;
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';

  /** Inflation toggle (6% annual inflation) */
  adjustForInflation = false;
  readonly inflationRate = 6;

  openFaq: number | null = null;
  showFullTable = false;
  graphMode: 'both' | 'value' = 'both';

  /** Cached computed values */
  projectionRows: Array<{year: number; invested: number; value: number; gains: number}> = [];

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
    this.seo.setTitle('SIP Calculator India 2026 – Free Online SIP Return Calculator for Mutual Funds');
    this.seo.setDescription('Free SIP calculator India 2026. Calculate returns on ₹1000, ₹5000 or any monthly SIP. See how compounding grows your wealth over 5, 10, 20 years. Step-up SIP, inflation adjustment & ₹1 crore planning.');
    this.seo.updateOgTags(
      'SIP Calculator India 2026 – Free Online SIP Return Calculator',
      'Calculate your SIP returns instantly. Free, accurate, no login required.',
      'https://www.myinvestmentcalculator.in/sip-calculator'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'SIP Calculator', 'item': 'https://www.myinvestmentcalculator.in/sip-calculator' }
      ]
    }, 'sip-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/sip-calculator');
    this.seo.updateFAQSchema(this.faqs.map(f => ({ question: f.q, answer: f.a })));
    this.seo.setKeywords([
      'sip calculator india', 'sip return calculator', 'mutual fund sip calculator',
      'sip calculator online', 'sip investment calculator',
      '₹5000 sip returns', '₹1000 sip returns', 'step up sip calculator',
      'sip for 1 crore', 'monthly sip calculator', 'sbi sip calculator'
    ]);

    // ── REACTIVE CALCULATION: Auto-calculate on form value changes ──
    // Debounce to 300ms to avoid excessive calculations while dragging sliders
    this.calcSub = this.form.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => this.calculate());

    // Calculate once with initial values so user sees result immediately
    if (this.form.valid) {
      this.calculate();
    }
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

    // Cache projection rows for the template
    this.projectionRows = this.getProjectionRows(monthlyInvestment, annualRate, years);

    // Trigger change detection for OnPush strategy
    this.cdr.markForCheck();

    // Render growth chart after a tick (DOM needs to render the canvas first)
    setTimeout(() => {
      this.renderGrowthChart();
      this.renderDoughnutChart();
    }, 50);

    this.apiStatus = 'loading';
    this.sub?.unsubscribe();
    this.sub = this.svc.calculateSip({ monthlyInvestment, annualRate, years }).subscribe({
      next:  (res) => { this.result = { ...res, localCalc: true }; this.apiStatus = 'success'; this.cdr.markForCheck(); },
      error: (err) => { this.apiError = err.message;              this.apiStatus = 'error';   this.cdr.markForCheck(); }
    });
  }

  /** Calculates SIP future value using: FV = P × [((1 + r)^n − 1) / r] × (1 + r),
   *  where P = monthly payment, r = monthly rate (annual rate ÷ 12), n = total months */
  private calcSipFV(monthly: number, annualRate: number, years: number): number {
    const r = annualRate / 100 / 12;
    const n = years * 12;
    return r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  }

  /** Inflation-adjusted (real) value: deflate FV by inflation over the same period */
  getRealValue(nominalValue: number, years: number): number {
    return nominalValue / Math.pow(1 + this.inflationRate / 100, years);
  }

  /** Inflation-adjusted returns = real corpus − total invested */
  getRealReturns(nominalValue: number, totalInvested: number, years: number): number {
    return this.getRealValue(nominalValue, years) - totalInvested;
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
    const extraFV = this.calcSipFV(monthlyInvestment + 500, annualRate, years);
    const extraGain = Math.round(extraFV - this.result.totalValue);
    insights.push({
      icon: '📈',
      text: `Increase SIP by <strong>₹500</strong> → Gain <strong>₹${this.formatIndian(extraGain)}</strong> extra`
    });

    // Insight 2: Invest 5 more years
    if (years <= 35) {
      const moreFV = this.calcSipFV(monthlyInvestment, annualRate, years + 5);
      const moreGain = Math.round(moreFV - this.result.totalValue);
      insights.push({
        icon: '⏳',
        text: `Investing <strong>5 more years</strong> → +<strong>₹${this.formatIndian(moreGain)}</strong> extra wealth`
      });
    }

    // Insight 3: Power of compounding — last half creates most wealth
    const midPoint = Math.floor(years / 2);
    if (midPoint >= 1) {
      const midFV = this.calcSipFV(monthlyInvestment, annualRate, midPoint);
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

  /** Format value in Indian notation (L / Cr) */
  formatIndian(val: number): string {
    if (val >= 10000000) return (val / 10000000).toFixed(2) + ' Cr';
    if (val >= 100000) return (val / 100000).toFixed(2) + ' L';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toFixed(0);
  }

  /** Format summary strip values (compact) */
  formatCompact(val: number): string {
    if (val >= 10000000) return '₹' + (val / 10000000).toFixed(1) + 'Cr';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
    if (val >= 1000) return '₹' + (val / 1000).toFixed(0) + 'K';
    return '₹' + val.toFixed(0);
  }

  scrollToTop(): void {
    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.calcSub?.unsubscribe();
    this.seo.removeJsonLd('sip-breadcrumb');
    this.seo.removeFAQSchema();
    this.chartInstance?.destroy();
    this.doughnutChartInstance?.destroy();
  }

  /** Render or update the large Doughnut chart (Groww-style) */
  renderDoughnutChart(): void {
    if (!this.isBrowser || !this.doughnutChartRef?.nativeElement || !this.result) return;

    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables);

      const invested = this.result!.totalInvested;
      const returns = this.result!.estimatedReturns;

      if (this.doughnutChartInstance) {
        this.doughnutChartInstance.data.datasets[0].data = [invested, returns];
        this.doughnutChartInstance.update('none');
        return;
      }

      const ctx = this.doughnutChartRef.nativeElement.getContext('2d');
      if (!ctx) return;

      this.doughnutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Invested Amount', 'Est. Returns'],
          datasets: [{
            data: [invested, returns],
            backgroundColor: ['#4B5EAA', '#00C896'],
            borderColor: ['rgba(75,94,170,0.4)', 'rgba(0,200,150,0.4)'],
            borderWidth: 2,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111D4A',
              titleColor: '#F0F4FF',
              bodyColor: '#A8B4D4',
              borderColor: 'rgba(245,166,35,0.3)',
              borderWidth: 1,
              callbacks: {
                label: (ctx: any) => {
                  const val = ctx.parsed;
                  const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const pct = ((val / total) * 100).toFixed(1);
                  return `${ctx.label}: ₹${val.toLocaleString('en-IN')} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    });
  }

  /** Render or update the SIP growth area chart */
  renderGrowthChart(): void {
    if (!this.isBrowser || !this.growthChartRef?.nativeElement || !this.projectionRows.length) return;

    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables);

      const labels = this.projectionRows.map(r => `Year ${r.year}`);
      const investedData = this.projectionRows.map(r => r.invested);
      const valueData = this.projectionRows.map(r => r.value);
      const gainsData = this.projectionRows.map(r => r.gains);

      // Destroy previous chart to rebuild with new mode
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }

      const ctx = this.growthChartRef.nativeElement.getContext('2d');
      if (!ctx) return;

      // Create premium gradient fills
      const investedGrad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
      investedGrad.addColorStop(0, 'rgba(168,180,212,0.18)');
      investedGrad.addColorStop(1, 'rgba(168,180,212,0.01)');

      const valueGrad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
      valueGrad.addColorStop(0, 'rgba(245,166,35,0.28)');
      valueGrad.addColorStop(0.7, 'rgba(245,166,35,0.06)');
      valueGrad.addColorStop(1, 'rgba(245,166,35,0.0)');

      const datasets: any[] = this.graphMode === 'value'
        ? [
            {
              label: 'Portfolio Value',
              data: valueData,
              borderColor: '#F5A623',
              backgroundColor: valueGrad,
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 7,
              pointBackgroundColor: '#F5A623'
            }
          ]
        : [
            {
              label: 'Total Invested',
              data: investedData,
              borderColor: 'rgba(168,180,212,0.8)',
              backgroundColor: investedGrad,
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#A8B4D4',
              borderDash: [6, 3]
            },
            {
              label: 'Portfolio Value',
              data: valueData,
              borderColor: '#F5A623',
              backgroundColor: valueGrad,
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 7,
              pointBackgroundColor: '#F5A623'
            }
          ];

      this.chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: {
              labels: { color: '#A8B4D4', font: { size: 12 }, usePointStyle: true, pointStyle: 'circle' }
            },
            tooltip: {
              backgroundColor: '#111D4A',
              titleColor: '#F0F4FF',
              bodyColor: '#A8B4D4',
              borderColor: 'rgba(245,166,35,0.3)',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                afterBody: (items: any[]) => {
                  if (!items.length) return '';
                  const idx = items[0].dataIndex;
                  return `Returns: ₹${gainsData[idx].toLocaleString('en-IN')}`;
                },
                label: (ctx: any) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#7B8DB5', font: { size: 11 } },
              grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y: {
              ticks: {
                color: '#7B8DB5',
                font: { size: 11 },
                callback: (val: any) => '₹' + (val >= 10000000 ? (val / 10000000).toFixed(1) + 'Cr' : val >= 100000 ? (val / 100000).toFixed(1) + 'L' : (val / 1000).toFixed(0) + 'K')
              },
              grid: { color: 'rgba(255,255,255,0.04)' }
            }
          }
        }
      });
    });
  }
}