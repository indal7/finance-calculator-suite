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
  selector: 'app-sip-1-crore',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './sip-1-crore.html',
  styleUrls: ['./sip-1-crore.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Sip1CroreComponent implements OnInit, OnDestroy {
  private readonly fb  = inject(FormBuilder);
  private readonly seo = inject(SeoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private quickSub?: Subscription;

  @ViewChild('growthChart') growthChartRef!: ElementRef<HTMLCanvasElement>;
  private chartInstance: any = null;

  form = this.fb.group({
    monthlyInvestment: [10000, positiveNumber(500)],
    annualRate:        [12,    positiveNumber(1)],
    years:             [20,    positiveNumber(1)]
  });

  result: { totalInvested: number; estimatedReturns: number; totalValue: number } | null = null;
  quickEstimate: { totalValue: number; totalInvested: number; estimatedReturns: number } | null = null;
  stepUpRate = 0;
  openFaq: number | null = null;
  showFullTable = false;
  projectionRows: Array<{year: number; invested: number; value: number; gains: number}> = [];
  copied = false;
  private copyTimer?: ReturnType<typeof setTimeout>;

  /** Pre-computed goal table: SIP amount needed for ₹1 Crore at various rates/durations */
  readonly goalTable = [
    { years: 10, r10: 46500, r12: 43500, r15: 39000 },
    { years: 15, r10: 24000, r12: 20000, r15: 15500 },
    { years: 20, r10: 13100, r12: 10000, r15:  6600 },
    { years: 25, r10:  7500, r12:  5300, r15:  3100 },
    { years: 30, r10:  4400, r12:  2800, r15:  1500 }
  ];

  readonly faqs = [
    { q: 'How much SIP is needed per month to reach ₹1 crore?', a: 'At 12% annual return: ₹10,000/month for ~20 years, ₹5,000/month for ~24 years, or ₹15,000/month for ~16 years. With a 10% annual step-up starting at ₹5,000, you reach ₹1 crore in about 16 years.' },
    { q: 'Can I reach ₹1 crore with ₹5,000 SIP per month?', a: 'Yes. ₹5,000/month at 12% return takes approximately 24 years to reach ₹1 crore. With a 10% annual step-up, the same starting SIP reaches ₹1 crore in about 16 years — much faster with nominal increase in monthly commitment.' },
    { q: 'How long does it take ₹10,000 SIP to reach ₹1 crore?', a: 'At 12% expected annual return, ₹10,000/month SIP reaches ₹1 crore in approximately 18 years. At 15% return (possible with mid/small-cap funds), it takes about 15 years.' },
    { q: 'Is it realistic to reach ₹1 crore through SIP?', a: 'Absolutely. ₹1 crore is very achievable through disciplined SIP investing. India has over 9 crore active SIP accounts in 2026. The key factors are: start early, invest consistently, choose equity mutual funds for long-term goals, and use step-up SIP to accelerate.' },
    { q: 'What is the fastest way to reach ₹1 crore via SIP?', a: 'The fastest approach combines three strategies: (1) Higher monthly SIP — ₹25,000/month at 12% reaches ₹1 crore in ~12 years, (2) Step-up SIP — increase by 10% annually, (3) Higher-growth funds like mid-cap or small-cap with 15%+ returns. This can cut the timeline to under 10 years.' }
  ];

  constructor() {
    this.seo.setTitle('SIP Calculator for ₹1 Crore 2026 — How Much Monthly SIP Do You Need?');
    this.seo.setDescription('Free ₹1 crore SIP calculator India. Find out how much monthly SIP you need to reach ₹1 crore. ₹10,000/month at 12% = ₹1 crore in ~18 years. Interactive calculator with chart & step-up SIP.');
    this.seo.updateOgTags(
      'SIP Calculator for ₹1 Crore 2026 — How Much Monthly SIP Needed?',
      'Calculate how much monthly SIP you need to build ₹1 crore. Free goal-based SIP calculator with step-up.',
      'https://www.myinvestmentcalculator.in/sip-calculator-1-crore'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'SIP Calculator', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 3, 'name': 'SIP for ₹1 Crore', 'item': 'https://www.myinvestmentcalculator.in/sip-calculator-1-crore' }
      ]
    }, 'sip1cr-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/sip-calculator-1-crore');
    this.seo.updateFAQSchema(this.faqs.map(f => ({ question: f.q, answer: f.a })));
    this.seo.setKeywords([
      'sip for 1 crore', 'sip calculator 1 crore', 'how to reach 1 crore with sip',
      '1 crore sip plan', 'monthly sip for 1 crore india', 'sip investment plan for 1 crore',
      '10000 sip for 1 crore', '5000 sip for 1 crore', 'how much sip needed for 1 crore'
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

    // How close to ₹1 crore?
    const target = 10000000;
    const pctToGoal = Math.round((this.result.totalValue / target) * 100);
    if (pctToGoal < 100) {
      insights.push({ icon: '🎯', text: `You are at <strong>${pctToGoal}%</strong> of ₹1 crore. Increase SIP or duration to reach your goal.` });
    } else {
      insights.push({ icon: '🎯', text: `<strong>Congratulations!</strong> Your SIP exceeds ₹1 crore (₹${this.formatIndian(Math.round(this.result.totalValue))})` });
    }

    if (years <= 35) {
      const moreFV = this.calcSipFV(monthlyInvestment, annualRate, years + 5, this.stepUpRate);
      insights.push({ icon: '⏳', text: `Investing <strong>5 more years</strong> → +<strong>₹${this.formatIndian(Math.round(moreFV - this.result.totalValue))}</strong> extra wealth` });
    }
    return insights;
  }

  formatIndian(val: number): string { if (val >= 10000000) return (val/10000000).toFixed(2)+' Cr'; if (val >= 100000) return (val/100000).toFixed(2)+' L'; if (val >= 1000) return (val/1000).toFixed(1)+'K'; return val.toFixed(0); }
  formatCompact(val: number): string { if (val >= 10000000) return '₹'+(val/10000000).toFixed(1)+'Cr'; if (val >= 100000) return '₹'+(val/100000).toFixed(1)+'L'; if (val >= 1000) return '₹'+(val/1000).toFixed(0)+'K'; return '₹'+val.toFixed(0); }

  copyResult(): void {
    if (!this.result) return;
    const { totalInvested, estimatedReturns, totalValue } = this.result;
    const { monthlyInvestment, annualRate, years } = this.form.getRawValue() as any;
    const text = `SIP Calculator Result (₹1 Crore Goal)\nMonthly Investment: ₹${monthlyInvestment?.toLocaleString('en-IN')}\nAnnual Return: ${annualRate}%\nPeriod: ${years} years\n─────────────────\nTotal Invested:  ₹${totalInvested?.toLocaleString('en-IN')}\nEstimated Gains: ₹${estimatedReturns?.toLocaleString('en-IN')}\nTotal Value:     ₹${totalValue?.toLocaleString('en-IN')}\nCalculated at www.myinvestmentcalculator.in`;
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
    this.quickSub?.unsubscribe(); this.seo.removeJsonLd('sip1cr-breadcrumb'); this.seo.removeFAQSchema(); this.chartInstance?.destroy(); clearTimeout(this.copyTimer);
  }
}
