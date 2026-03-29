import { Component, inject, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnDestroy {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setTitle('Best Investment Calculator India 2026 – SIP, EMI, FD & CAGR Calculator Online');
    this.seo.setDescription('Use the best SIP, EMI, FD & CAGR calculator in India. Calculate ₹5,000 SIP returns, loan EMI, FD maturity & investment growth instantly. 100% free & accurate.');
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/');
    this.seo.updateOgTags(
      'Best Investment Calculator India 2026 – SIP, EMI, FD & CAGR Calculator Online',
      'Use the best SIP, EMI, FD & CAGR calculator in India. Calculate ₹5,000 SIP returns, loan EMI, FD maturity & investment growth instantly. 100% free & accurate.',
      'https://www.myinvestmentcalculator.in/'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Best Investment Calculators India – SIP, EMI, FD & CAGR',
      'url': 'https://www.myinvestmentcalculator.in/',
      'description': 'Free SIP, EMI, FD and CAGR calculators for Indian investors. No login required.',
      'breadcrumb': {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' }
        ]
      }
    }, 'home-webpage');
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('home-webpage');
  }
}
