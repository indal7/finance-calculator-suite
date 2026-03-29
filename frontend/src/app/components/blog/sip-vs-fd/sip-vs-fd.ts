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

  readonly title = 'SIP vs FD: Which is Better for Long-Term Wealth Creation in India?';
  readonly description = 'Compare SIP mutual funds vs Fixed Deposits for long-term wealth creation. Understand returns, risk, liquidity, and tax implications to make the right choice.';

  constructor() {
    this.seo.setTitle(this.title);
    this.seo.setDescription(this.description);
    this.seo.setKeywords(['SIP vs FD', 'SIP or FD which is better', 'mutual fund vs fixed deposit India', 'long term investment India', 'SIP returns vs FD returns']);
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
      'datePublished': '2026-01-15',
      'dateModified': '2026-01-15',
      'author': { '@type': 'Organization', 'name': 'Finance Calculator India' },
      'publisher': { '@type': 'Organization', 'name': 'Finance Calculator India', 'url': 'https://www.myinvestmentcalculator.in' }
    }, 'sip-vs-fd-article');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/blog/sip-vs-fd');
    this.seo.updateFAQSchema([
      { question: 'Is SIP better than FD for long-term investment?', answer: 'For long-term wealth creation (10+ years), SIP in equity mutual funds typically outperforms FD with potential returns of 12–15% vs FD\'s 6–7.5%. However, SIP carries market risk while FD is guaranteed.' },
      { question: 'What is the main difference between SIP and FD?', answer: 'SIP is a method of investing in mutual funds through regular monthly contributions, linked to market performance. FD is a bank deposit with a guaranteed fixed interest rate. SIP is market-linked and riskier, but offers higher long-term returns.' },
      { question: 'Can I do both SIP and FD together?', answer: 'Yes, and it\'s actually a good strategy. Use FD for your emergency fund and short-term goals (1–3 years) where capital protection is key. Use SIP for long-term goals (5+ years) where wealth creation matters more.' },
      { question: 'Is FD interest taxable in India?', answer: 'Yes, FD interest is fully taxable as per your income tax slab. TDS is deducted at 10% if interest exceeds ₹40,000/year (₹50,000 for senior citizens). SIP (equity) LTCG is taxed at 12.5% only on gains above ₹1.25 lakh/year after 1 year.' },
      { question: 'What is a tax-saving FD?', answer: 'A 5-year tax-saving FD allows deduction up to ₹1.5 lakh under Section 80C, but has a lock-in period of 5 years and interest is still taxable. ELSS mutual funds also qualify for 80C with a shorter 3-year lock-in and potentially higher returns.' }
    ]);
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('sip-vs-fd-breadcrumb');
    this.seo.removeJsonLd('sip-vs-fd-article');
    this.seo.removeFAQSchema();
  }
}
