import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';

import { CalculatorService, LumpsumResult } from '../../services/calculator';
import { SeoService } from '../../services/seo.service';
import { BaseCalculator } from '../base-calculator';

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
export class LumpsumCalculatorComponent extends BaseCalculator implements OnInit, OnDestroy {
  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(CalculatorService);
  private readonly seo = inject(SeoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;
  private calcSub?: Subscription;

  @ViewChild('growthChart') growthChartRef!: ElementRef<HTMLCanvasElement>;
  private growthChartInstance: any = null;

  override form = this.fb.group({
    principal:  [100000, positiveNumber(1000)],
    annualRate: [12,     positiveNumber(1)],
    years:      [10,     positiveNumber(1)]
  });

  result: (LumpsumResult & { localCalc: true }) | null = null;

  projectionRows: Array<{year: number; invested: number; value: number; gains: number}> = [];

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
    super();
    this.seo.setTitle('Lumpsum Calculator India 2026 – Free One-Time Investment Return Calculator');
    this.seo.setDescription('Free lumpsum calculator India 2026. Calculate returns on one-time mutual fund investments. ₹1 lakh at 12% for 10 years = ₹3.11 lakh. Year-by-year projections & comparison with SIP.');
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

  /** Rows visible in table — 5 by default, all when expanded */
  get displayedRows(): Array<{year: number; invested: number; value: number; gains: number}> {
    return this.showFullTable ? this.projectionRows : this.projectionRows.slice(0, 5);
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

  renderGrowthChart(): void {
    if (!this.isBrowser || !this.growthChartRef?.nativeElement || !this.projectionRows.length) return;

    import('../../services/chart-setup').then(({ registerChartComponents }) => {
      const Chart = registerChartComponents();

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
      investedGrad.addColorStop(0, 'rgba(173,181,189,0.18)');
      investedGrad.addColorStop(1, 'rgba(173,181,189,0.01)');

      const valueGrad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
      valueGrad.addColorStop(0, 'rgba(245,166,35,0.25)');
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
              borderColor: 'rgba(173,181,189,0.8)',
              backgroundColor: investedGrad,
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#adb5bd'
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
              labels: { color: '#6c757d', font: { size: 12 }, usePointStyle: true, pointStyle: 'circle' }
            },
            tooltip: {
              backgroundColor: '#1a1a2e',
              titleColor: '#ffffff',
              bodyColor: '#ced4da',
              borderColor: 'rgba(245,166,35,0.3)',
              borderWidth: 1,
              callbacks: {
                label: (ctx: any) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.calcSub?.unsubscribe();
    this.seo.removeJsonLd('lumpsum-breadcrumb');
    this.seo.removeFAQSchema();
    this.growthChartInstance?.destroy();
  }
}
