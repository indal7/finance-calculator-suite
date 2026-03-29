import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-income-tax-calculator',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './income-tax-calculator.html',
  styleUrls: ['./income-tax-calculator.css']
})
export class IncomeTaxCalculatorComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setTitle('Income Tax Calculator India FY 2026-27 – New vs Old Tax Regime');
    this.seo.setDescription('Calculate income tax under new vs old tax regime for FY 2026-27. Free India income tax calculator with all deductions.');
    this.seo.setKeywords(['income tax calculator India', 'tax calculator FY 2026-27', 'new vs old tax regime calculator', 'income tax slab India 2026', 'take home salary calculator India']);
    this.seo.updateOgTags(
      'Income Tax Calculator India FY 2026-27 – New vs Old Tax Regime',
      'Calculate income tax under new vs old regime. Free India income tax calculator with all deductions.',
      'https://www.myinvestmentcalculator.in/income-tax-calculator'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Income Tax Calculator', 'item': 'https://www.myinvestmentcalculator.in/income-tax-calculator' }
      ]
    }, 'income-tax-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/income-tax-calculator');
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('income-tax-breadcrumb');
  }
}
