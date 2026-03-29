import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-ppf-calculator',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ppf-calculator.html',
  styleUrls: ['./ppf-calculator.css']
})
export class PpfCalculatorComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setTitle('PPF Calculator India 2026 – Public Provident Fund Returns Calculator');
    this.seo.setDescription('Calculate your PPF maturity amount, interest earned and year-wise growth. Free PPF calculator for India with current 7.1% interest rate.');
    this.seo.setKeywords(['PPF calculator', 'PPF interest calculator India', 'public provident fund calculator', 'PPF maturity calculator 2026', 'PPF 15 year returns']);
    this.seo.updateOgTags(
      'PPF Calculator India – Public Provident Fund Returns Calculator',
      'Calculate PPF maturity amount and interest. Free, accurate PPF calculator for Indian investors.',
      'https://www.myinvestmentcalculator.in/ppf-calculator'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'PPF Calculator', 'item': 'https://www.myinvestmentcalculator.in/ppf-calculator' }
      ]
    }, 'ppf-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/ppf-calculator');
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('ppf-breadcrumb');
  }
}
