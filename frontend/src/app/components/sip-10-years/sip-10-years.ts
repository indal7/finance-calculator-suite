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
  selector: 'app-sip-10-years',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './sip-10-years.html',
  styleUrls: ['./sip-10-years.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Sip10YearsComponent implements OnInit, OnDestroy {
  private readonly fb  = inject(FormBuilder);
  private readonly seo = inject(SeoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private quickSub?: Subscription;

  @ViewChild('growthChart') growthChartRef!: ElementRef<HTMLCanvasElement>;
  private chartInstance: any = null;

  form = this.fb.group({
    monthlyInvestment: [5000,  positiveNumber(500)],
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

  /** Pre-computed: 10-year returns for different SIP amounts at various rates */
  readonly comparisonTable = [
    { sip: 1000,  r10: 206556,  r12: 232339,  r15: 278736 },
    { sip: 2000,  r10: 413113,  r12: 464678,  r15: 557472 },
    { sip: 5000,  r10: 1032782, r12: 1161695, r15: 1393680 },
    { sip: 10000, r10: 2065564, r12: 2323390, r15: 2787360 },
    { sip: 15000, r10: 3098346, r12: 3485085, r15: 4181040 },
    { sip: 25000, r10: 5163910, r12: 5808475, r15: 6968400 },
    { sip: 50000, r10: 10327820, r12: 11616950, r15: 13936800 }
  ];

  readonly faqs = [
    { q: 'How much will ₹5,000 SIP give in 10 years?', a: 'At 12% annual return, ₹5,000/month SIP for 10 years grows to approximately ₹11.6 lakh. Your total investment is ₹6 lakh with estimated gains of ₹5.6 lakh — nearly doubling your money.' },
    { q: 'Is 10 years enough for SIP to give good returns?', a: 'Yes, 10 years is a solid investment horizon for SIP. At 12% return, your money approximately doubles. At 15%, it could grow to 2.3×. Historically, equity mutual funds have consistently delivered 10–14% returns over 10-year periods in India.' },
    { q: 'Which mutual fund is best for 10-year SIP?', a: 'For 10-year SIP, consider: (1) Flexi-cap funds for balanced growth, (2) Large & mid-cap funds for moderate risk, or (3) Mid-cap funds for higher growth. Nifty 50 Index Fund is an excellent low-cost option for beginners.' },
    { q: 'What is the expected return of 10-year SIP in India?', a: 'Based on historical data, equity mutual fund SIPs in India have delivered 10–14% CAGR over 10-year periods. Large-cap funds average 10–12%, flexi-cap funds 11–13%, and mid-cap funds 12–15%. Past performance does not guarantee future results.' },
    { q: 'Should I do SIP for 10 years or 20 years?', a: '20 years is significantly better due to compounding. ₹5,000/month at 12% for 10 years = ₹11.6L, but for 20 years = ₹49.96L (4.3× more with only 2× more investment). If you can invest for 20 years, the wealth creation is dramatically higher.' }
  ];

  constructor() {
    this.seo.setTitle('SIP Calculator for 10 Years 2026 — ₹1K, ₹5K, ₹10K Monthly Returns');
    this.seo.setDescription('Free 10-year SIP calculator India. Compare SIP returns for ₹1,000, ₹5,000, ₹10,000/month over 10 years. ₹5,000 SIP at 12% = ₹11.6L in 10 years. Interactive calculator with chart & projections.');
    this.seo.updateOgTags(
      'SIP Calculator for 10 Years 2026 — Compare ₹1K, ₹5K, ₹10K Returns',
      'Calculate 10-year SIP returns for any monthly amount. Free interactive calculator with graph & year-by-year projections.',
      'https://www.myinvestmentcalculator.in/sip-calculator-10-years'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'SIP Calculator', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 3, 'name': '10-Year SIP Calculator', 'item': 'https://www.myinvestmentcalculator.in/sip-calculator-10-years' }
      ]
    }, 'sip10yr-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/sip-calculator-10-years');
    this.seo.updateFAQSchema(this.faqs.map(f => ({ question: f.q, answer: f.a })));
    this.seo.setKeywords([
      'sip calculator 10 years', 'sip for 10 years returns', '10 year sip calculator india',
      'sip 5000 per month for 10 years', 'sip 10000 per month 10 year returns',
      'sip returns 10 years', 'best sip plan for 10 years india',
      '10 year mutual fund sip returns', 'sip calculator 10 year comparison'
    ]);
    this.quickSub = this.form.valueChanges.pipe(debounceTime(150)).subscribe(() => this.updateQuickEstimate());
    this.updateQuickEstimate();
    if (this.form.valid) this.calculate();
  }

  get f() { return this.form.controls; }
  syncSlider(_field: string): void {}
  syncFromSlider(field: string, event: Event): void { this.form.get(field)?.setValue(parseFloat((event.target as HTMLInputElement).value)); }
  getSliderPct(field: string, min: number, max: number): number { const val = this.form.get(field)?.value ?? min; return Math.round(((val - min) / (max - min)) * 100); }
  toggleFaq(index: number): void { this.openFaq = this.openFaq === index ? null : index; }
  setStepUp(rate: number): void { this.stepUpRate = rate; }

  updateQuickEstimate(): void {
    if (this.form.invalid) return;
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const r = annualRate / 100 / 12;
    let totalInvested = 0, totalValue = 0;
    for (let y = 1; y <= years; y++) { for (let m = 0; m < 12; m++) { totalInvested += monthlyInvestment; totalValue = (totalValue + monthlyInvestment) * (1 + r); } }
    this.quickEstimate = { totalValue: +totalValue.toFixed(2), totalInvested: +totalInvested.toFixed(2), estimatedReturns: +(totalValue - totalInvested).toFixed(2) };
    this.cdr.markForCheck();
  }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const r = annualRate / 100 / 12, stepUp = this.stepUpRate / 100;
    let totalInvested = 0, totalValue = 0;
    for (let y = 1; y <= years; y++) { const cm = monthlyInvestment * Math.pow(1 + stepUp, y - 1); for (let m = 0; m < 12; m++) { totalInvested += cm; totalValue = (totalValue + cm) * (1 + r); } }
    this.result = { totalInvested: +totalInvested.toFixed(2), estimatedReturns: +(totalValue - totalInvested).toFixed(2), totalValue: +totalValue.toFixed(2) };
    this.projectionRows = this.getProjectionRows(monthlyInvestment, annualRate, years);
    this.cdr.markForCheck();
    setTimeout(() => this.renderGrowthChart(), 50);
  }

  getProjectionRows(mi: number, ar: number, ty: number): Array<{year: number; invested: number; value: number; gains: number}> {
    const r = ar / 100 / 12, stepUp = this.stepUpRate / 100, rows = [];
    let cI = 0, cV = 0;
    for (let y = 1; y <= ty; y++) { const cm = mi * Math.pow(1 + stepUp, y - 1); for (let m = 0; m < 12; m++) { cI += cm; cV = (cV + cm) * (1 + r); } rows.push({ year: y, invested: +cI.toFixed(0), value: +cV.toFixed(0), gains: +(cV - cI).toFixed(0) }); }
    return rows;
  }

  get displayedRows() { return this.showFullTable ? this.projectionRows : this.projectionRows.slice(0, 5); }

  private calcSipFV(monthly: number, rate: number, years: number, stepUpPct = 0): number {
    const r = rate / 100 / 12, s = stepUpPct / 100; let fv = 0;
    for (let y = 1; y <= years; y++) { const cm = monthly * Math.pow(1 + s, y - 1); for (let m = 0; m < 12; m++) fv = (fv + cm) * (1 + r); }
    return fv;
  }

  get smartInsights(): Array<{icon: string; text: string}> {
    if (!this.result) return [];
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const insights: Array<{icon: string; text: string}> = [];
    const extraFV = this.calcSipFV(monthlyInvestment + 1000, annualRate, years, this.stepUpRate);
    insights.push({ icon: '📈', text: `Increase SIP by <strong>₹1,000</strong> → Gain <strong>₹${this.formatIndian(Math.round(extraFV - this.result.totalValue))}</strong> extra in ${years} years` });
    if (years <= 35) { const moreFV = this.calcSipFV(monthlyInvestment, annualRate, years + 5, this.stepUpRate); insights.push({ icon: '⏳', text: `Extending to <strong>${years + 5} years</strong> → +<strong>₹${this.formatIndian(Math.round(moreFV - this.result.totalValue))}</strong> extra wealth` }); }
    return insights;
  }

  formatIndian(val: number): string { if (val >= 10000000) return (val/10000000).toFixed(2)+' Cr'; if (val >= 100000) return (val/100000).toFixed(2)+' L'; if (val >= 1000) return (val/1000).toFixed(1)+'K'; return val.toFixed(0); }
  formatCompact(val: number): string { if (val >= 10000000) return '₹'+(val/10000000).toFixed(1)+'Cr'; if (val >= 100000) return '₹'+(val/100000).toFixed(1)+'L'; if (val >= 1000) return '₹'+(val/1000).toFixed(0)+'K'; return '₹'+val.toFixed(0); }
  formatLakh(val: number): string { return (val / 100000).toFixed(1) + 'L'; }

  copyResult(): void {
    if (!this.result) return;
    const { totalInvested, estimatedReturns, totalValue } = this.result;
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const text = `SIP Calculator Result (10-Year)\nMonthly Investment: ₹${monthlyInvestment?.toLocaleString('en-IN')}\nAnnual Return: ${annualRate}%\nPeriod: ${years} years\n─────────────────\nTotal Invested:  ₹${totalInvested?.toLocaleString('en-IN')}\nEstimated Gains: ₹${estimatedReturns?.toLocaleString('en-IN')}\nTotal Value:     ₹${totalValue?.toLocaleString('en-IN')}\nCalculated at www.myinvestmentcalculator.in`;
    navigator.clipboard.writeText(text).catch(() => {});
    this.copied = true; clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => { this.copied = false; this.cdr.markForCheck(); }, 2200);
  }

  scrollToCalculator(): void { if (this.isBrowser) document.getElementById('sip-calculator')?.scrollIntoView({ behavior: 'smooth' }); }
  scrollToResult(): void { this.calculate(); if (this.isBrowser) setTimeout(() => document.getElementById('result-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }

  renderGrowthChart(): void {
    if (!this.isBrowser || !this.growthChartRef?.nativeElement || !this.projectionRows.length) return;
    import('../../services/chart-setup').then(({ registerChartComponents }) => {
      const Chart = registerChartComponents();
      const labels = this.projectionRows.map(r => `Yr ${r.year}`);
      const investedData = this.projectionRows.map(r => r.invested);
      const returnsData = this.projectionRows.map(r => r.gains);
      if (this.chartInstance) { this.chartInstance.destroy(); this.chartInstance = null; }
      const ctx = this.growthChartRef.nativeElement.getContext('2d'); if (!ctx) return;
      this.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [
          { label: 'Invested', data: investedData, backgroundColor: '#dee2e6', borderRadius: 2, barPercentage: 0.7, categoryPercentage: 0.8 },
          { label: 'Returns', data: returnsData, backgroundColor: '#00B386', borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }, barPercentage: 0.7, categoryPercentage: 0.8 }
        ]},
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
          scales: {
            x: { stacked: true, ticks: { color: '#6c757d', font: { size: 11 } }, grid: { display: false } },
            y: { stacked: true, ticks: { color: '#6c757d', font: { size: 11 }, callback: (val: any) => '₹' + (val >= 10000000 ? (val/10000000).toFixed(2)+'Cr' : val >= 100000 ? (val/100000).toFixed(1)+'L' : (val/1000).toFixed(0)+'K') }, grid: { color: 'rgba(0,0,0,0.05)' } }
          },
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1a2e', titleColor: '#ffffff', bodyColor: '#ced4da', borderColor: 'rgba(0,179,134,0.3)', borderWidth: 1, padding: 12,
            callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`, afterBody: (items: any[]) => { if (!items.length) return ''; const idx = items[0].dataIndex; return `Total: ₹${(investedData[idx] + returnsData[idx]).toLocaleString('en-IN')}`; } }
          }}
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.quickSub?.unsubscribe(); this.seo.removeJsonLd('sip10yr-breadcrumb'); this.seo.removeFAQSchema(); this.chartInstance?.destroy(); clearTimeout(this.copyTimer);
  }
}
