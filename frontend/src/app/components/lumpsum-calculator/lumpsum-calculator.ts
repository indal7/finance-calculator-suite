import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, OnDestroy, OnInit, ViewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';

import { CalculatorService, LumpsumResult } from '../../services/calculator';
import { SeoService } from '../../services/seo.service';

function positiveNumber(min = 0.01) {
  return Validators.compose([Validators.required, Validators.min(min)])!;
}

@Component({
  selector: 'app-lumpsum-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './lumpsum-calculator.html',
  styleUrls: ['./lumpsum-calculator.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LumpsumCalculatorComponent implements OnInit, OnDestroy {
  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(CalculatorService);
  private readonly seo = inject(SeoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;
  private calcSub?: Subscription;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @ViewChild('doughnutChart') doughnutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('growthChart') growthChartRef!: ElementRef<HTMLCanvasElement>;
  private doughnutChartInstance: any = null;
  private growthChartInstance: any = null;

  form = this.fb.group({
    principal:  [100000, positiveNumber(1000)],
    annualRate: [12,     positiveNumber(1)],
    years:      [10,     positiveNumber(1)]
  });

  result: (LumpsumResult & { localCalc: true }) | null = null;
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';

  projectionRows: Array<{year: number; invested: number; value: number; gains: number}> = [];
  showFullTable = false;

  copied = false;
  private copyTimer?: ReturnType<typeof setTimeout>;

  openFaq: number | null = null;

  readonly faqs = [
    {
      q: 'What is a lumpsum investment?',
      a: 'A lumpsum investment is a one-time investment of a large amount in a mutual fund or other financial instrument, as opposed to investing smaller amounts periodically through SIP.'
    },
    {
      q: 'How is lumpsum return calculated?',
      a: 'Lumpsum returns are calculated using the compound interest formula: FV = P × (1 + r)^t, where P is the principal, r is the annual rate of return, and t is the number of years.'
    },
    {
      q: 'Is lumpsum investment better than SIP?',
      a: 'Lumpsum works well when markets are at a low point and you have surplus funds. SIP is better for regular investors as it averages out market volatility through rupee cost averaging. For long-term wealth creation, a combination of both strategies often works best.'
    },
    {
      q: 'What is the minimum amount for lumpsum investment in mutual funds?',
      a: 'Most mutual funds in India accept lumpsum investments starting from ₹1,000 to ₹5,000. Some funds may have higher minimums for specific schemes.'
    },
    {
      q: 'How is lumpsum investment taxed in India?',
      a: 'For equity mutual funds, gains from investments held less than 12 months are taxed at 20% (STCG). Gains above ₹1.25 lakh from investments held over 12 months are taxed at 12.5% (LTCG) from FY 2024-25.'
    },
    {
      q: 'What is the best time to make a lumpsum investment?',
      a: 'The best time for lumpsum investment is during market corrections or when valuations are reasonable. However, timing the market is difficult — for most investors, staying invested for the long term matters more than entry timing.'
    }
  ];

  constructor() {
    this.seo.setTitle('Lumpsum Calculator India 2026 – One-Time Investment Return Calculator');
    this.seo.setDescription('Calculate returns on one-time lump sum investments in mutual funds. Free lumpsum investment calculator for Indian investors.');
    this.seo.setKeywords(['lumpsum calculator', 'lump sum investment calculator India', 'one time investment returns', 'mutual fund lumpsum returns', 'lumpsum vs SIP India']);
    this.seo.updateOgTags(
      'Lumpsum Calculator India – One-Time Investment Return Calculator',
      'Calculate returns on one-time lump sum investments. Free, accurate lumpsum calculator for Indian investors.',
      'https://www.myinvestmentcalculator.in/lumpsum-calculator'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Lumpsum Calculator', 'item': 'https://www.myinvestmentcalculator.in/lumpsum-calculator' }
      ]
    }, 'lumpsum-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/lumpsum-calculator');
    this.seo.updateFAQSchema(this.faqs.map(f => ({ question: f.q, answer: f.a })));

    this.calcSub = this.form.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => this.calculate());

    if (this.form.valid) {
      this.calculate();
    }
  }

  get f() { return this.form.controls; }

  syncSlider(field: string): void { }

  syncFromSlider(field: string, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.form.get(field)?.setValue(val);
  }

  getSliderPct(field: string, min: number, max: number): number {
    const val = this.form.get(field)?.value ?? min;
    return Math.round(((val - min) / (max - min)) * 100);
  }

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? null : index;
  }

  /** Rows visible in table — 5 by default, all when expanded */
  get displayedRows(): Array<{year: number; invested: number; value: number; gains: number}> {
    return this.showFullTable ? this.projectionRows : this.projectionRows.slice(0, 5);
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
    const { principal, annualRate, years } = this.form.getRawValue() as any;
    const insights: Array<{icon: string; text: string}> = [];

    // Insight 1: Returns as multiplier
    const multiplier = (this.result.totalValue / principal).toFixed(1);
    insights.push({
      icon: '\ud83d\udcb0',
      text: `Your money grows <strong>${multiplier}x</strong> — a total gain of <strong>\u20b9${this.formatIndian(this.result.estimatedReturns)}</strong>`
    });

    // Insight 2: Compare with FD
    const fdRate = 7;
    const fdValue = Math.round(principal * Math.pow(1 + fdRate / 100, years));
    const extraGain = Math.round(this.result.totalValue - fdValue);
    if (extraGain > 0) {
      insights.push({
        icon: '\ud83c\udfe6',
        text: `You earn <strong>\u20b9${this.formatIndian(extraGain)}</strong> more than a 7% FD over ${years} years`
      });
    } else {
      insights.push({
        icon: '\ud83c\udfe6',
        text: `A 7% FD would return <strong>\u20b9${this.formatIndian(Math.abs(extraGain))}</strong> more — consider risk vs reward`
      });
    }

    // Insight 3: Doubling period (Rule of 72)
    const doublingYears = (72 / annualRate).toFixed(1);
    insights.push({
      icon: '\ud83d\ude80',
      text: `At <strong>${annualRate}%</strong>, your money doubles every <strong>${doublingYears} years</strong> (Rule of 72)`
    });

    return insights;
  }

  copyResult(): void {
    if (!this.result) return;
    const { totalInvested, estimatedReturns, totalValue } = this.result;
    const { principal, annualRate, years } = this.form.getRawValue() as any;
    const text = [
      `Lumpsum Calculator Result`,
      `Investment Amount: ₹${principal?.toLocaleString('en-IN')}`,
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
    this.copyTimer = setTimeout(() => { this.copied = false; this.cdr.markForCheck(); }, 2200);
  }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { principal, annualRate, years } =
      this.form.getRawValue() as { principal: number; annualRate: number; years: number };

    const r  = annualRate / 100;
    const fv = principal * Math.pow(1 + r, years);

    const totalInvested    = +principal.toFixed(2);
    const totalValue       = +fv.toFixed(2);
    const estimatedReturns = +(totalValue - totalInvested).toFixed(2);

    this.result = { totalInvested, estimatedReturns, totalValue, localCalc: true };

    this.projectionRows = this.getProjectionRows(principal, annualRate, years);

    this.cdr.markForCheck();

    setTimeout(() => {
      this.renderDoughnutChart();
      this.renderGrowthChart();
    }, 50);

    this.apiStatus = 'loading';
    this.sub?.unsubscribe();
    this.sub = this.svc.calculateLumpsum({ principal, annualRate, years }).subscribe({
      next:  (res) => { this.result = { ...res, localCalc: true }; this.apiStatus = 'success'; this.cdr.markForCheck(); },
      error: (err) => { this.apiError = err.message;              this.apiStatus = 'error';   this.cdr.markForCheck(); }
    });
  }

  private getProjectionRows(principal: number, annualRate: number, totalYears: number): Array<{year: number; invested: number; value: number; gains: number}> {
    const r = annualRate / 100;
    const rows = [];
    for (let y = 1; y <= totalYears; y++) {
      const value = +(principal * Math.pow(1 + r, y)).toFixed(0);
      rows.push({ year: y, invested: +principal.toFixed(0), value, gains: value - principal });
    }
    return rows;
  }

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

  renderGrowthChart(): void {
    if (!this.isBrowser || !this.growthChartRef?.nativeElement || !this.projectionRows.length) return;

    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables);

      const labels = this.projectionRows.map(r => `Year ${r.year}`);
      const investedData = this.projectionRows.map(r => r.invested);
      const valueData = this.projectionRows.map(r => r.value);

      if (this.growthChartInstance) {
        this.growthChartInstance.data.labels = labels;
        this.growthChartInstance.data.datasets[0].data = investedData;
        this.growthChartInstance.data.datasets[1].data = valueData;
        this.growthChartInstance.update('none');
        return;
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

      this.growthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Invested Amount',
              data: investedData,
              borderColor: 'rgba(168,180,212,0.8)',
              backgroundColor: investedGrad,
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#A8B4D4'
            },
            {
              label: 'Portfolio Value',
              data: valueData,
              borderColor: '#F5A623',
              backgroundColor: valueGrad,
              borderWidth: 2,
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
              labels: { color: '#A8B4D4', font: { size: 12 }, usePointStyle: true, pointStyle: 'circle' }
            },
            tooltip: {
              backgroundColor: '#111D4A',
              titleColor: '#F0F4FF',
              bodyColor: '#A8B4D4',
              borderColor: 'rgba(245,166,35,0.3)',
              borderWidth: 1,
              callbacks: {
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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.calcSub?.unsubscribe();
    this.seo.removeJsonLd('lumpsum-breadcrumb');
    this.seo.removeFAQSchema();
    this.doughnutChartInstance?.destroy();
    this.growthChartInstance?.destroy();
  }
}
