import { Component, inject, ChangeDetectorRef, OnDestroy, OnInit, ViewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';

import { CalculatorService, CagrResult } from '../../services/calculator';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-cagr-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, DecimalPipe],
  templateUrl: './cagr-calculator.html',
  styleUrls: ['./cagr-calculator.css']
})
export class CagrCalculator implements OnInit, OnDestroy {
  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(CalculatorService);
  private readonly seo      = inject(SeoService);
  private readonly cdr      = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private sub?: Subscription;
  private calcSub?: Subscription;

  @ViewChild('cagrGrowthChart') cagrGrowthChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cagrDoughnutChart') cagrDoughnutChartRef!: ElementRef<HTMLCanvasElement>;
  private chartInstance: any = null;
  private doughnutInstance: any = null;
  cagrProjectionCache: Array<{year: number; value: number; gain: number}> = [];

  form = this.fb.group({
    beginningValue: [50000,  [Validators.required, Validators.min(0.01)]],
    endingValue:    [100000, [Validators.required, Validators.min(0.01)]],
    years:          [5,      [Validators.required, Validators.min(0.08)]]
  });

  result: (CagrResult & { localCalc: true }) | null = null;
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';
  openFaq: number | null = null;
  showFullTable = false;

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

  /** Rows visible in table — 5 by default, all when expanded */
  get displayedRows(): Array<{year: number; value: number; gain: number}> {
    return this.showFullTable ? this.cagrProjectionCache : this.cagrProjectionCache.slice(0, 5);
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
    if (val >= 10000000) return '\u20b9' + (val / 10000000).toFixed(1) + 'Cr';
    if (val >= 100000) return '\u20b9' + (val / 100000).toFixed(1) + 'L';
    if (val >= 1000) return '\u20b9' + (val / 1000).toFixed(0) + 'K';
    return '\u20b9' + val.toFixed(0);
  }

  scrollToTop(): void {
    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Smart insights dynamically computed from current result */
  get smartInsights(): Array<{icon: string; text: string}> {
    if (!this.result) return [];
    const { beginningValue, endingValue, years } = this.form.getRawValue() as any;
    const insights: Array<{icon: string; text: string}> = [];

    // Insight 1: Compare with Nifty 50 benchmark (12% long-term CAGR)
    const niftyBenchmark = 12;
    const diff = (this.result.cagr - niftyBenchmark).toFixed(1);
    insights.push({
      icon: '\ud83d\udcc8',
      text: this.result.cagr >= niftyBenchmark
        ? `Your CAGR <strong>beats</strong> Nifty 50 average (12%) by <strong>${diff}%</strong>`
        : `Your CAGR <strong>trails</strong> Nifty 50 average (12%) by <strong>${Math.abs(parseFloat(diff))}%</strong>`
    });

    // Insight 2: Total gain as multiplier
    const multiplier = (endingValue / beginningValue).toFixed(1);
    insights.push({
      icon: '\ud83d\udcb0',
      text: `Your investment grew <strong>${multiplier}x</strong> — a total gain of <strong>\u20b9${this.formatIndian(this.result.totalGain)}</strong>`
    });

    // Insight 3: ₹1L projection
    const projected = Math.round(100000 * Math.pow(endingValue / beginningValue, 1));
    insights.push({
      icon: '\ud83d\ude80',
      text: `At <strong>${this.result.cagr}%</strong> CAGR, \u20b91L becomes <strong>\u20b9${this.formatIndian(Math.round(100000 * Math.pow(1 + this.result.cagr / 100, years)))}</strong> in ${years} years`
    });

    return insights;
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
    this.seo.setTitle('CAGR Calculator India 2026 – Free Compound Annual Growth Rate Calculator Online');
    this.seo.setDescription('Free CAGR calculator India to calculate compound annual growth rate of stocks, mutual funds & investments. Compare Nifty 50, Sensex & mutual fund CAGR. No login.');
    this.seo.updateOgTags(
      'CAGR Calculator India 2026 – Free Annual Growth Rate Calculator',
      'Calculate your investment CAGR instantly. Compare with Nifty 50 & Sensex. Free, accurate, no login required.',
      'https://www.myinvestmentcalculator.in/cagr-calculator'
    );
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
    this.seo.setKeywords([
      'cagr calculator india', 'cagr calculator online',
      'compound annual growth rate calculator', 'mutual fund cagr calculator',
      'stock return calculator india', 'nifty 50 cagr calculator',
      'nifty 50 cagr 10 years', 'sensex cagr calculator'
    ]);
    this.seo.updateFAQSchema(this.faqs.map(f => ({ question: f.q, answer: f.a })));

    // ── REACTIVE CALCULATION: Auto-calculate on form value changes ──
    this.calcSub = this.form.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => this.calculate());

    // Calculate once with initial values so user sees result immediately
    if (this.form.valid) {
      this.calculate();
    }
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

    // Cache projection rows and render chart
    this.cagrProjectionCache = this.getCagrProjectionRows(beginningValue, endingValue, years);
    setTimeout(() => this.renderGrowthChart(), 50);
    setTimeout(() => this.renderCagrDoughnutChart(beginningValue, totalGain), 50);

    // Trigger change detection for OnPush strategy
    this.cdr.markForCheck();

    this.apiStatus = 'loading';
    this.sub?.unsubscribe();
    this.sub = this.svc.calculateCagr({ beginningValue, endingValue, years }).subscribe({
      next:  (res) => { this.result = { ...res, localCalc: true }; this.apiStatus = 'success'; this.cdr.markForCheck(); },
      error: (err) => { this.apiError = err.message;              this.apiStatus = 'error';   this.cdr.markForCheck(); }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.calcSub?.unsubscribe();
    this.seo.removeJsonLd('cagr-breadcrumb');
    this.seo.removeFAQSchema();
    this.chartInstance?.destroy();
    this.doughnutInstance?.destroy();
  }

  /** Render or update the CAGR growth line chart */
  renderGrowthChart(): void {
    if (!this.isBrowser || !this.cagrGrowthChartRef?.nativeElement || !this.cagrProjectionCache.length) return;

    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables);

      const beginVal = this.form.getRawValue().beginningValue ?? 0;
      const labels = this.cagrProjectionCache.map(r => `Year ${r.year}`);
      const baselineData = this.cagrProjectionCache.map(() => beginVal);
      const valueData = this.cagrProjectionCache.map(r => r.value);

      if (this.chartInstance) {
        this.chartInstance.data.labels = labels;
        this.chartInstance.data.datasets[0].data = baselineData;
        this.chartInstance.data.datasets[1].data = valueData;
        this.chartInstance.update('none');
        return;
      }

      const ctx = this.cagrGrowthChartRef.nativeElement.getContext('2d');
      if (!ctx) return;

      const investedGrad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
      investedGrad.addColorStop(0, 'rgba(168,180,212,0.18)');
      investedGrad.addColorStop(1, 'rgba(168,180,212,0.01)');

      const valueGrad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
      valueGrad.addColorStop(0, 'rgba(0,200,150,0.28)');
      valueGrad.addColorStop(0.7, 'rgba(0,200,150,0.06)');
      valueGrad.addColorStop(1, 'rgba(0,200,150,0.0)');

      this.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Initial Investment',
              data: baselineData,
              borderColor: 'rgba(168,180,212,0.8)',
              backgroundColor: investedGrad,
              borderWidth: 2,
              fill: true,
              tension: 0,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#A8B4D4',
              borderDash: [6, 3]
            },
            {
              label: 'Investment Value',
              data: valueData,
              borderColor: '#00C896',
              backgroundColor: valueGrad,
              borderWidth: 2.5,
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#00C896'
            }
          ]
        },
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
              borderColor: 'rgba(0,200,150,0.3)',
              borderWidth: 1,
              callbacks: {
                label: (ctx: any) => `${ctx.dataset.label}: \u20b9${ctx.parsed.y.toLocaleString('en-IN')}`
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
                callback: (val: any) => '\u20b9' + (val >= 10000000 ? (val / 10000000).toFixed(1) + 'Cr' : val >= 100000 ? (val / 100000).toFixed(1) + 'L' : (val / 1000).toFixed(0) + 'K')
              },
              grid: { color: 'rgba(255,255,255,0.04)' }
            }
          }
        }
      });
    });
  }

  /** Render or update the CAGR doughnut chart (initial vs gain) */
  renderCagrDoughnutChart(beginningValue: number, totalGain: number): void {
    if (!this.isBrowser || !this.cagrDoughnutChartRef?.nativeElement) return;

    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables);

      if (this.doughnutInstance) {
        this.doughnutInstance.data.datasets[0].data = [beginningValue, totalGain];
        this.doughnutInstance.update('none');
        return;
      }

      const ctx = this.cagrDoughnutChartRef.nativeElement.getContext('2d');
      if (!ctx) return;

      this.doughnutInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Initial Investment', 'Total Gain'],
          datasets: [{
            data: [beginningValue, totalGain],
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
              borderColor: 'rgba(0,200,150,0.3)',
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
}