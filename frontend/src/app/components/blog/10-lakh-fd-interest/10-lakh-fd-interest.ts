import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../services/seo.service';

@Component({
  selector: 'app-blog-10-lakh-fd-interest',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './10-lakh-fd-interest.html',
  styleUrls: ['./10-lakh-fd-interest.css']
})
export class Fd10LakhInterestBlogComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);

  readonly title = '₹10 Lakh FD Interest Per Month in 2026: SBI, HDFC, ICICI & Post Office Comparison';
  readonly description = 'See how much monthly and yearly interest a ₹10 lakh FD earns in 2026. Compare SBI, HDFC, ICICI, PNB, post office, and small finance bank rates.';

  constructor() {
    this.seo.setTitle(this.title);
    this.seo.setDescription(this.description);
    this.seo.setKeywords([
      '10 lakh fd interest per month',
      'fd interest calculator india',
      'sbi fd rates 2026',
      'post office fd interest',
      'senior citizen fd rates'
    ]);
    this.seo.updateOgTags(this.title, this.description, 'https://www.myinvestmentcalculator.in/blog/10-lakh-fd-interest');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': 'https://www.myinvestmentcalculator.in/blog' },
        { '@type': 'ListItem', 'position': 3, 'name': '₹10 Lakh FD Interest', 'item': 'https://www.myinvestmentcalculator.in/blog/10-lakh-fd-interest' }
      ]
    }, 'fd-10-lakh-breadcrumb');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': this.title,
      'description': this.description,
      'datePublished': '2026-03-30',
      'dateModified': '2026-03-30',
      'author': { '@type': 'Organization', 'name': 'Finance Calculator India' },
      'publisher': { '@type': 'Organization', 'name': 'Finance Calculator India', 'url': 'https://www.myinvestmentcalculator.in' }
    }, 'fd-10-lakh-article');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/blog/10-lakh-fd-interest');
    this.seo.updateFAQSchema([
      {
        question: 'How much monthly interest does ₹10 lakh FD give?',
        answer: 'At 7% annual rate, ₹10 lakh FD gives around ₹5,833 per month in simple-interest terms. Effective annual yield may vary with compounding frequency.'
      },
      {
        question: 'Which bank gives highest FD return for ₹10 lakh?',
        answer: 'Small finance banks often provide higher rates (8% to 9%), while large banks like SBI, HDFC, and ICICI generally offer around 6.8% to 7.5% depending on tenure and customer type.'
      },
      {
        question: 'Do senior citizens get higher FD rates?',
        answer: 'Yes. Most banks offer an additional 0.25% to 0.50% interest to senior citizens, improving total maturity amount.'
      },
      {
        question: 'Is FD interest taxable in India?',
        answer: 'Yes, FD interest is taxable as per your income slab. Banks may deduct TDS if annual interest crosses threshold limits.'
      },
      {
        question: 'Should I choose FD or SIP for long-term goals?',
        answer: 'FD is suitable for capital safety and predictable returns. SIP is generally better for long-term wealth creation with higher return potential but market-linked risk.'
      }
    ]);
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('fd-10-lakh-breadcrumb');
    this.seo.removeJsonLd('fd-10-lakh-article');
    this.seo.removeFAQSchema();
  }
}
