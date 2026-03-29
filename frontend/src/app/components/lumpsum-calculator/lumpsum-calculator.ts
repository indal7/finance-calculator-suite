import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-lumpsum-calculator',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './lumpsum-calculator.html',
  styleUrls: ['./lumpsum-calculator.css']
})
export class LumpsumCalculatorComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);

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
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('lumpsum-breadcrumb');
  }
}
