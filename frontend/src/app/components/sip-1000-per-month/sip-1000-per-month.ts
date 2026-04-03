import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, OnDestroy, OnInit, ViewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';
import { SeoService } from '../../services/seo.service';

function positiveNumber(min = 0.01) {
  return Validators.compose([Validators.required, Validators.min(min)])!;
}

@Component({
  selector: 'app-sip-1000-per-month',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './sip-1000-per-month.html',
  styleUrls: ['./sip-1000-per-month.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Sip1000PerMonthComponent implements OnInit, OnDestroy {
  private readonly fb  = inject(FormBuilder);
  private readonly seo = inject(SeoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private quickSub?: Subscription;

  @ViewChild('growthChart') growthChartRef!: ElementRef<HTMLCanvasElement>;
  private chartInstance: any = null;

  form = this.fb.group({
    monthlyInvestment: [1000,  positiveNumber(500)],
    annualRate:        [12,    positiveNumber(1)],
    years:             [10,    positiveNumber(1)]
  });

  result: { totalInvested: number; estimatedReturns: number; totalValue: number } | null = null;
  quickEstimate: { totalValue: number; totalInvested: number; estimatedReturns: number } | null = null;
  stepUpRate = 0;
  openFaq: number | null = null;
  showFullTable = false;
  projectionRows: Array<{year: number; invested: number; value: number; gains: number}> = [];
  copied = false;
  private copyTimer?: ReturnType<typeof setTimeout>;

  readonly faqs = [
    { q: 'How much will ₹1,000 SIP grow in 10 years?', a: 'At 12% annual return, ₹1,000/month SIP for 10 years grows to approximately ₹2.32 lakh. Your total investment is ₹1.2 lakh with estimated gains of ₹1.12 lakh — nearly doubling your money through compounding.' },
    { q: 'Can I start SIP with just ₹1,000 per month?', a: 'Yes! Most mutual fund houses in India allow SIP starting from ₹500/month. ₹1,000 is a very popular starting amount, especially for beginners and students. Many top-rated funds on platforms like Groww, Zerodha Coin, and Kuvera support ₹1,000 SIPs.' },
    { q: 'How much will ₹1,000 SIP give after 20 years?', a: 'At 12% annual return, ₹1,000/month for 20 years grows to approximately ₹9.99 lakh. That is over 4× your total investment of ₹2.4 lakh. At 15% return (mid-cap average), it grows to ₹15.16 lakh.' },
    { q: 'Which mutual fund is best for ₹1,000 SIP?', a: 'For beginners investing ₹1,000/month, a Nifty 50 Index Fund (like UTI Nifty 50, HDFC Nifty 50) offers low cost and broad diversification. For higher growth, consider flexi-cap funds. Always choose direct plans for lower expense ratios.' },
    { q: 'Is ₹1,000 SIP enough to build wealth?', a: 'Yes, ₹1,000/month for 25 years at 12% grows to ~₹18.9 lakh. With a 10% annual step-up, the same SIP grows to over ₹50 lakh. The key is starting early and staying consistent — even small amounts compound dramatically over time.' }
  ];

  constructor() {
    this.seo.setTitle('₹1,000 SIP Calculator 2026 — Monthly Returns for 5, 10, 15, 20, 25 Years');
    this.seo.setDescription('Free ₹1,000 SIP calculator India. See how ₹1,000/month grows to ₹2.32L in 10 years & ₹9.99L in 20 years at 12% return. Interactive calculator with chart, year-by-year projection & step-up SIP.');
    this.seo.updateOgTags(
      '₹1,000 SIP Calculator 2026 — Monthly Returns for 5, 10, 15, 20, 25 Years',
      'Calculate ₹1,000 SIP returns for 5, 10, 15, 20, 25 years. Free interactive calculator with graph & projections.',
      'https://www.myinvestmentcalculator.in/sip-calculator-1000-per-month'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'SIP Calculator', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 3, 'name': '₹1,000 SIP Calculator', 'item': 'https://www.myinvestmentcalculator.in/sip-calculator-1000-per-month' }
      ]
    }, 'sip1000-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/sip-calculator-1000-per-month');
    this.seo.updateFAQSchema(this.faqs.map(f => ({ question: f.q, answer: f.a })));
    this.seo.setKeywords([
      '1000 sip per month', '₹1000 sip calculator', '1000 rupees sip returns',
      '1000 sip for 10 years', '1000 sip for 20 years', 'sip calculator 1000 monthly',
      '₹1000 monthly sip returns', 'best sip for 1000 per month india'
    ]);
    this.quickSub = this.form.valueChanges.pipe(debounceTime(150)).subscribe(() => this.updateQuickEstimate());
    this.updateQuickEstimate();
    if (this.form.valid) this.calculate();
  }

  get f() { return this.form.controls; }

  syncSlider(_field: string): void {}

  syncFromSlider(field: string, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.form.get(field)?.setValue(val);
  }

  getSliderPct(field: string, min: number, max: number): number {
    const val = this.form.get(field)?.value ?? min;
    return Math.round(((val - min) / (max - min)) * 100);
  }

  toggleFaq(index: number): void { this.openFaq = this.openFaq === index ? null : index; }

  setStepUp(rate: number): void { this.stepUpRate = rate; }

  updateQuickEstimate(): void {
    if (this.form.invalid) return;
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const r = annualRate / 100 / 12;
    let totalInvested = 0, totalValue = 0;
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) { totalInvested += monthlyInvestment; totalValue = (totalValue + monthlyInvestment) * (1 + r); }
    }
    this.quickEstimate = { totalValue: +totalValue.toFixed(2), totalInvested: +totalInvested.toFixed(2), estimatedReturns: +(totalValue - totalInvested).toFixed(2) };
    this.cdr.markForCheck();
  }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const r = annualRate / 100 / 12;
    const stepUp = this.stepUpRate / 100;
    let totalInvested = 0, totalValue = 0;
    for (let y = 1; y <= years; y++) {
      const cm = monthlyInvestment * Math.pow(1 + stepUp, y - 1);
      for (let m = 0; m < 12; m++) { totalInvested += cm; totalValue = (totalValue + cm) * (1 + r); }
    }
    this.result = { totalInvested: +totalInvested.toFixed(2), estimatedReturns: +(totalValue - totalInvested).toFixed(2), totalValue: +totalValue.toFixed(2) };
    this.projectionRows = this.getProjectionRows(monthlyInvestment, annualRate, years);
    this.cdr.markForCheck();
    setTimeout(() => this.renderGrowthChart(), 50);
  }

  getProjectionRows(mi: number, ar: number, ty: number): Array<{year: number; invested: number; value: number; gains: number}> {
    const r = ar / 100 / 12, stepUp = this.stepUpRate / 100, rows = [];
    let cI = 0, cV = 0;
    for (let y = 1; y <= ty; y++) {
      const cm = mi * Math.pow(1 + stepUp, y - 1);
      for (let m = 0; m < 12; m++) { cI += cm; cV = (cV + cm) * (1 + r); }
      rows.push({ year: y, invested: +cI.toFixed(0), value: +cV.toFixed(0), gains: +(cV - cI).toFixed(0) });
    }
    return rows;
  }

  get displayedRows() { return this.showFullTable ? this.projectionRows : this.projectionRows.slice(0, 5); }

  private calcSipFV(monthly: number, rate: number, years: number, stepUpPct = 0): number {
    const r = rate / 100 / 12, s = stepUpPct / 100;
    let fv = 0;
    for (let y = 1; y <= years; y++) { const cm = monthly * Math.pow(1 + s, y - 1); for (let m = 0; m < 12; m++) fv = (fv + cm) * (1 + r); }
    return fv;
  }

  get smartInsights(): Array<{icon: string; text: string}> {
    if (!this.result) return [];
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const insights: Array<{icon: string; text: string}> = [];
    const extraFV = this.calcSipFV(monthlyInvestment + 500, annualRate, years, this.stepUpRate);
    insights.push({ icon: '📈', text: `Increase SIP by <strong>₹500</strong> → Gain <strong>₹${this.formatIndian(Math.round(extraFV - this.result.totalValue))}</strong> extra` });
    if (years <= 35) {
      const moreFV = this.calcSipFV(monthlyInvestment, annualRate, years + 5, this.stepUpRate);
      insights.push({ icon: '⏳', text: `Investing <strong>5 more years</strong> → +<strong>₹${this.formatIndian(Math.round(moreFV - this.result.totalValue))}</strong> extra wealth` });
    }
    return insights;
  }

  formatIndian(val: number): string {
    if (val >= 10000000) return (val / 10000000).toFixed(2) + ' Cr';
    if (val >= 100000) return (val / 100000).toFixed(2) + ' L';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toFixed(0);
  }

  formatCompact(val: number): string {
    if (val >= 10000000) return '₹' + (val / 10000000).toFixed(1) + 'Cr';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
    if (val >= 1000) return '₹' + (val / 1000).toFixed(0) + 'K';
    return '₹' + val.toFixed(0);
  }

  copyResult(): void {
    if (!this.result) return;
    const { totalInvested, estimatedReturns, totalValue } = this.result;
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const text = `SIP Calculator Result\nMonthly Investment: ₹${monthlyInvestment?.toLocaleString('en-IN')}\nAnnual Return: ${annualRate}%\nPeriod: ${years} years\n─────────────────\nTotal Invested:  ₹${totalInvested?.toLocaleString('en-IN')}\nEstimated Gains: ₹${estimatedReturns?.toLocaleString('en-IN')}\nTotal Value:     ₹${totalValue?.toLocaleString('en-IN')}\nCalculated at www.myinvestmentcalculator.in`;
    navigator.clipboard.writeText(text).catch(() => {});
    this.copied = true;
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => { this.copied = false; this.cdr.markForCheck(); }, 2200);
  }

  scrollToCalculator(): void {
    if (this.isBrowser) document.getElementById('sip-calculator')?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToResult(): void {
    this.calculate();
    if (this.isBrowser) setTimeout(() => document.getElementById('result-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  renderGrowthChart(): void {
    if (!this.isBrowser || !this.growthChartRef?.nativeElement || !this.projectionRows.length) return;
    import('../../services/chart-setup').then(({ registerChartComponents }) => {
      const Chart = registerChartComponents();
      const labels = this.projectionRows.map(r => `Yr ${r.year}`);
      const investedData = this.projectionRows.map(r => r.invested);
      const returnsData = this.projectionRows.map(r => r.gains);
      if (this.chartInstance) { this.chartInstance.destroy(); this.chartInstance = null; }
      const ctx = this.growthChartRef.nativeElement.getContext('2d');
      if (!ctx) return;
      this.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Invested', data: investedData, backgroundColor: '#dee2e6', borderRadius: 2, barPercentage: 0.7, categoryPercentage: 0.8 },
            { label: 'Returns', data: returnsData, backgroundColor: '#00B386', borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }, barPercentage: 0.7, categoryPercentage: 0.8 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          scales: {
            x: { stacked: true, ticks: { color: '#6c757d', font: { size: 11 } }, grid: { display: false } },
            y: { stacked: true, ticks: { color: '#6c757d', font: { size: 11 }, callback: (val: any) => '₹' + (val >= 10000000 ? (val/10000000).toFixed(2)+'Cr' : val >= 100000 ? (val/100000).toFixed(1)+'L' : (val/1000).toFixed(0)+'K') }, grid: { color: 'rgba(0,0,0,0.05)' } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1a2e', titleColor: '#ffffff', bodyColor: '#ced4da', borderColor: 'rgba(0,179,134,0.3)', borderWidth: 1, padding: 12,
              callbacks: {
                label: (ctx: any) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`,
                afterBody: (items: any[]) => { if (!items.length) return ''; const idx = items[0].dataIndex; return `Total: ₹${(investedData[idx] + returnsData[idx]).toLocaleString('en-IN')}`; }
              }
            }
          }
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.quickSub?.unsubscribe();
    this.seo.removeJsonLd('sip1000-breadcrumb');
    this.seo.removeFAQSchema();
    this.chartInstance?.destroy();
    clearTimeout(this.copyTimer);
  }
}
