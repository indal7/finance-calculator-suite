import { Component, ChangeDetectionStrategy, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnDestroy {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setTitle('SIP Calculator India 2026 – Free EMI, FD, CAGR & Mutual Fund Calculator Online');
    this.seo.setDescription('Free online SIP calculator, EMI calculator, FD calculator & CAGR calculator for Indian investors. Calculate mutual fund SIP returns, loan EMI, fixed deposit interest & growth rate instantly — no login needed.');
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/');
    this.seo.setKeywords([
      'sip calculator india', 'emi calculator india', 'fd calculator india',
      'cagr calculator', 'mutual fund calculator india', 'financial calculator india 2026',
      'investment calculator online free', 'sip return calculator'
    ]);
    this.seo.updateOgTags(
      'SIP Calculator India 2026 – Free EMI, FD & CAGR Calculator Online',
      'Free online SIP calculator, EMI calculator, FD calculator & CAGR calculator for Indian investors. Calculate returns instantly — no login needed.',
      'https://www.myinvestmentcalculator.in/'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Best SIP Calculator India 2026 – EMI, FD & CAGR Calculator Online',
      'url': 'https://www.myinvestmentcalculator.in/',
      'description': 'Use the best SIP calculator India to calculate ₹5,000 monthly returns, EMI, FD maturity & CAGR instantly. Free, accurate & India-specific financial tools.'
    }, 'home-webpage');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' }
      ]
    }, 'home-breadcrumb');
    this.seo.updateFAQSchema([
      {
        question: 'What is the best free SIP calculator in India?',
        answer: 'A good SIP calculator should show monthly investment growth, total invested amount, estimated returns, and final corpus. Our SIP calculator includes step-up SIP, inflation adjustment, and reference tables for ₹1000, ₹5000, and ₹10000 monthly SIP amounts.'
      },
      {
        question: 'How do I calculate EMI for a home loan?',
        answer: 'Enter loan amount, annual interest rate, and tenure in years. The EMI calculator uses reducing-balance formula to compute monthly EMI, total interest, and total repayment. It can also provide amortization schedule for better planning.'
      },
      {
        question: 'How much interest does ₹10 lakh FD earn per month?',
        answer: 'At 7% annual interest, ₹10 lakh FD earns roughly ₹5,833 per month in simple-interest terms. Actual payout depends on payout option and compounding frequency. Senior citizens may earn slightly more due to higher FD rates.'
      },
      {
        question: 'What is CAGR and why is it important for investors?',
        answer: 'CAGR is the annualized return of an investment over a period, assuming compounding. It helps compare investments fairly across different time horizons and is widely used to benchmark portfolio performance against Nifty 50, Sensex, and other assets.'
      },
      {
        question: 'Are these calculators suitable for Indian investors?',
        answer: 'Yes. These calculators are built for Indian users with rupee-based inputs, bank-specific FD rates, common loan assumptions, and current tax context such as LTCG and Section 80C references.'
      }
    ]);
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('home-webpage');
    this.seo.removeJsonLd('home-breadcrumb');
    this.seo.removeFAQSchema();
  }
}
