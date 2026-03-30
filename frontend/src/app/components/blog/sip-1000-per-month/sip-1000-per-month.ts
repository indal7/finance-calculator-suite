import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../services/seo.service';

@Component({
  selector: 'app-blog-sip-1000',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sip-1000-per-month.html',
  styleUrls: ['./sip-1000-per-month.css']
})
export class Sip1000BlogComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);

  readonly title = '₹1,000 SIP Per Month for 5, 10, 15, 20 Years: Returns, Strategy & Planning';
  readonly description = 'See how much ₹1,000 per month SIP can grow in 5, 10, 15, and 20 years at 10%, 12%, and 15% returns. Ideal SIP plan for students and beginners in India.';

  constructor() {
    this.seo.setTitle(this.title);
    this.seo.setDescription(this.description);
    this.seo.setKeywords([
      '1000 SIP per month returns',
      '1000 rupees sip calculator',
      'sip for beginners india',
      'small sip investment plan',
      '1000 sip 20 years'
    ]);
    this.seo.updateOgTags(this.title, this.description, 'https://www.myinvestmentcalculator.in/blog/sip-1000-per-month');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': 'https://www.myinvestmentcalculator.in/blog' },
        { '@type': 'ListItem', 'position': 3, 'name': '₹1,000 SIP Per Month', 'item': 'https://www.myinvestmentcalculator.in/blog/sip-1000-per-month' }
      ]
    }, 'sip-1000-breadcrumb');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': this.title,
      'description': this.description,
      'datePublished': '2026-03-30',
      'dateModified': '2026-03-30',
      'author': { '@type': 'Organization', 'name': 'Finance Calculator India' },
      'publisher': { '@type': 'Organization', 'name': 'Finance Calculator India', 'url': 'https://www.myinvestmentcalculator.in' }
    }, 'sip-1000-article');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/blog/sip-1000-per-month');
    this.seo.updateFAQSchema([
      {
        question: 'How much will ₹1,000 SIP grow in 10 years?',
        answer: 'At 12% annual return, ₹1,000/month SIP for 10 years grows to around ₹2.32 lakh. Total invested is ₹1.2 lakh and estimated gains are ₹1.12 lakh.'
      },
      {
        question: 'How much will ₹1,000 SIP grow in 20 years?',
        answer: 'At 12% annual return, ₹1,000/month SIP for 20 years can grow to approximately ₹9.99 lakh, while total invested is only ₹2.4 lakh.'
      },
      {
        question: 'Is ₹1,000 SIP enough to start investing?',
        answer: 'Yes. ₹1,000 SIP is a strong starting point for students, first-job earners, and beginners. The most important factor is consistency and staying invested for at least 10 years.'
      },
      {
        question: 'Should I increase ₹1,000 SIP every year?',
        answer: 'Yes. A 10% annual step-up (₹1,000 to ₹1,100 in year 2 and so on) can significantly increase your final corpus without putting sudden pressure on your monthly budget.'
      },
      {
        question: 'Which funds are best for ₹1,000 SIP?',
        answer: 'For beginners, Nifty 50 index funds and flexi-cap funds are generally good options because they offer diversification and lower volatility than concentrated strategies.'
      }
    ]);
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('sip-1000-breadcrumb');
    this.seo.removeJsonLd('sip-1000-article');
    this.seo.removeFAQSchema();
  }
}
