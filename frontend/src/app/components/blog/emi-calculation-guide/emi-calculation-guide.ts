import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../services/seo.service';

@Component({
  selector: 'app-blog-emi-guide',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './emi-calculation-guide.html',
  styleUrls: ['./emi-calculation-guide.css']
})
export class EmiGuideBlogComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);

  readonly title = 'Complete Guide to EMI Calculation in India: Formula, Examples & Tips';
  readonly description = 'Learn how EMI is calculated for home loans, car loans and personal loans in India. Understand the reducing balance formula, amortization schedule, and tips to reduce your EMI burden.';

  constructor() {
    this.seo.setTitle(this.title);
    this.seo.setDescription(this.description);
    this.seo.setKeywords(['EMI calculation formula India', 'how to calculate EMI', 'home loan EMI calculator', 'EMI formula reducing balance', 'loan amortization India']);
    this.seo.updateOgTags(this.title, this.description, 'https://www.myinvestmentcalculator.in/blog/emi-calculation-guide');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': 'https://www.myinvestmentcalculator.in/blog' },
        { '@type': 'ListItem', 'position': 3, 'name': 'EMI Calculation Guide', 'item': 'https://www.myinvestmentcalculator.in/blog/emi-calculation-guide' }
      ]
    }, 'emi-guide-breadcrumb');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': this.title,
      'description': this.description,
      'datePublished': '2026-01-25',
      'dateModified': '2026-01-25',
      'author': { '@type': 'Organization', 'name': 'Finance Calculator India' },
      'publisher': { '@type': 'Organization', 'name': 'Finance Calculator India', 'url': 'https://www.myinvestmentcalculator.in' }
    }, 'emi-guide-article');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/blog/emi-calculation-guide');
    this.seo.updateFAQSchema([
      { question: 'What is the formula for EMI calculation?', answer: 'EMI = P × r × (1+r)^n / ((1+r)^n − 1), where P = principal loan amount, r = monthly interest rate (annual rate ÷ 12 ÷ 100), n = total number of monthly installments (years × 12).' },
      { question: 'How is EMI calculated on reducing balance?', answer: 'On a reducing balance, each month\'s interest is calculated on the outstanding principal (not the original loan). As you repay each EMI, the principal reduces, so interest portion decreases and principal repayment portion increases over time — this is shown in an amortization schedule.' },
      { question: 'What is the EMI for a ₹30 lakh home loan for 20 years at 8.5%?', answer: 'For a ₹30 lakh home loan at 8.5% annual interest for 20 years, the monthly EMI is approximately ₹26,035. Total payment over 20 years: ₹62.48 lakh. Total interest: ₹32.48 lakh.' },
      { question: 'How can I reduce my home loan EMI?', answer: 'To reduce your EMI: 1) Make a larger down payment to reduce principal. 2) Negotiate a lower interest rate with your bank (improve credit score). 3) Increase the tenure (though this increases total interest). 4) Make prepayments to reduce outstanding principal. 5) Switch to a lower-rate lender through balance transfer.' },
      { question: 'Does part prepayment reduce EMI or tenure?', answer: 'Most banks give you the choice. Reducing tenure (keeping EMI same) is mathematically better as it reduces total interest paid. Reducing EMI gives immediate monthly relief. Check your loan agreement for any prepayment charges (usually nil for floating rate home loans as per RBI guidelines).' }
    ]);
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('emi-guide-breadcrumb');
    this.seo.removeJsonLd('emi-guide-article');
    this.seo.removeFAQSchema();
  }
}
