import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../services/seo.service';

@Component({
  selector: 'app-blog-sip-vs-fd',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sip-vs-fd.html',
  styleUrls: ['./sip-vs-fd.css']
})
export class SipVsFdBlogComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);

  readonly title = 'SIP vs FD Difference in India: Which Option Fits Your Monthly Savings Plan?';
  readonly description = 'Understand SIP vs FD difference with a practical India-focused example. Compare monthly investing outcomes, flexibility, tax impact, and decide what suits your goal.';

  constructor() {
    this.seo.setTitle(this.title);
    this.seo.setDescription(this.description);
    this.seo.setKeywords([
      'SIP calculator India',
      'SIP vs FD difference',
      'monthly investment calculator India',
      'SIP or FD for beginners',
      '1000 SIP vs FD example'
    ]);
    this.seo.updateOgTags(this.title, this.description, 'https://www.myinvestmentcalculator.in/blog/sip-vs-fd');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': 'https://www.myinvestmentcalculator.in/blog' },
        { '@type': 'ListItem', 'position': 3, 'name': 'SIP vs FD', 'item': 'https://www.myinvestmentcalculator.in/blog/sip-vs-fd' }
      ]
    }, 'sip-vs-fd-breadcrumb');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': this.title,
      'description': this.description,
      'datePublished': '2026-03-30',
      'dateModified': '2026-03-30',
      'author': { '@type': 'Organization', 'name': 'Finance Calculator India' },
      'publisher': { '@type': 'Organization', 'name': 'Finance Calculator India', 'url': 'https://www.myinvestmentcalculator.in' }
    }, 'sip-vs-fd-article');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/blog/sip-vs-fd');
    this.seo.updateFAQSchema([
      {
        question: 'What is the biggest SIP vs FD difference for monthly savers?',
        answer: 'SIP amount gets invested in market-linked funds, so value moves up and down. FD gives fixed interest decided at the start. SIP can create a larger final amount over many years, while FD gives predictable maturity.'
      },
      {
        question: 'If I save ₹1000 per month for 10 years, should I choose SIP or FD?',
        answer: 'If your goal is growth and you can stay invested through market swings, SIP is usually better for this timeframe. If you need certainty and cannot accept fluctuations, choose FD or split savings between both.'
      },
      {
        question: 'Can I use SIP and FD together in one plan?',
        answer: 'Yes. Many Indian families keep emergency or near-term money in FD and put goal-based monthly savings in SIP. This gives both stability and growth potential.'
      },
      {
        question: 'How does tax treatment differ between SIP and FD?',
        answer: 'FD interest is added to income and taxed by slab. Equity SIP gains are taxed only when you redeem and rules differ by holding period and gain amount. Always review latest tax rules before investing.'
      },
      {
        question: 'Which calculator should I use before deciding?',
        answer: 'Use a SIP calculator for monthly mutual fund projection, FD calculator for fixed maturity estimate, and EMI calculator if you are balancing investments with loan payments.'
      }
    ]);
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('sip-vs-fd-breadcrumb');
    this.seo.removeJsonLd('sip-vs-fd-article');
    this.seo.removeFAQSchema();
  }
}
