import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../services/seo.service';

@Component({
  selector: 'app-blog-50-lakh-home-loan-emi',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './50-lakh-home-loan-emi.html',
  styleUrls: ['./50-lakh-home-loan-emi.css']
})
export class HomeLoan50LakhEmiBlogComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);

  readonly title = '₹50 Lakh Home Loan EMI in 2026: SBI, HDFC, ICICI Comparison + Savings Tips';
  readonly description = 'Calculate EMI for ₹50 lakh home loan across top Indian banks. Compare SBI, HDFC, ICICI rates and see tenure-wise EMI for 10, 15, 20, 25, 30 years.';

  constructor() {
    this.seo.setTitle(this.title);
    this.seo.setDescription(this.description);
    this.seo.setKeywords([
      '50 lakh home loan emi',
      'home loan emi calculator india',
      'sbi home loan emi 50 lakh',
      'hdfc home loan emi',
      'icici home loan emi'
    ]);
    this.seo.updateOgTags(this.title, this.description, 'https://www.myinvestmentcalculator.in/blog/50-lakh-home-loan-emi');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': 'https://www.myinvestmentcalculator.in/blog' },
        { '@type': 'ListItem', 'position': 3, 'name': '₹50 Lakh Home Loan EMI', 'item': 'https://www.myinvestmentcalculator.in/blog/50-lakh-home-loan-emi' }
      ]
    }, 'home-loan-50-breadcrumb');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': this.title,
      'description': this.description,
      'datePublished': '2026-03-30',
      'dateModified': '2026-03-30',
      'author': { '@type': 'Organization', 'name': 'Finance Calculator India' },
      'publisher': { '@type': 'Organization', 'name': 'Finance Calculator India', 'url': 'https://www.myinvestmentcalculator.in' }
    }, 'home-loan-50-article');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/blog/50-lakh-home-loan-emi');
    this.seo.updateFAQSchema([
      {
        question: 'What is EMI for ₹50 lakh home loan at 8.5% for 20 years?',
        answer: 'For ₹50 lakh at 8.5% over 20 years, EMI is approximately ₹43,391 per month. Total interest is around ₹54.1 lakh.'
      },
      {
        question: 'Which bank has lowest EMI for ₹50 lakh home loan in 2026?',
        answer: 'Based on listed rates, banks with lower interest rates like Bank of Baroda and SBI usually result in lower EMI than banks with 8.7% to 8.8% rates.'
      },
      {
        question: 'How can I reduce EMI for a ₹50 lakh home loan?',
        answer: 'You can reduce EMI by increasing tenure, negotiating lower interest rate, making higher down payment, or choosing part-prepayment strategy.'
      },
      {
        question: 'Is it better to reduce EMI or tenure after prepayment?',
        answer: 'Reducing tenure is usually better for total interest savings. Reducing EMI helps monthly cash flow. Choose based on your financial priorities.'
      },
      {
        question: 'How much salary is needed for ₹50 lakh home loan?',
        answer: 'Most lenders prefer EMI-to-income ratio below 40% to 50%. For EMI around ₹43,000, monthly net income of roughly ₹90,000 to ₹1,10,000 is generally needed.'
      }
    ]);
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('home-loan-50-breadcrumb');
    this.seo.removeJsonLd('home-loan-50-article');
    this.seo.removeFAQSchema();
  }
}
