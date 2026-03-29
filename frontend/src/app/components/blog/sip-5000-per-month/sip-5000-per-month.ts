import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../services/seo.service';

@Component({
  selector: 'app-blog-sip-5000',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sip-5000-per-month.html',
  styleUrls: ['./sip-5000-per-month.css']
})
export class Sip5000BlogComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);

  readonly title = 'What Happens If You Invest ₹5,000 Per Month via SIP for 10, 20, 30 Years?';
  readonly description = 'A detailed analysis of investing ₹5,000/month via SIP. See projected corpus at 10%, 12%, and 15% returns over 10, 20, and 30 years with compounding power.';

  constructor() {
    this.seo.setTitle(this.title);
    this.seo.setDescription(this.description);
    this.seo.setKeywords(['₹5000 SIP returns', '5000 per month SIP 10 years', 'SIP 5000 monthly calculator', 'SIP investment plan India', '5000 SIP 20 years returns']);
    this.seo.updateOgTags(this.title, this.description, 'https://www.myinvestmentcalculator.in/blog/sip-5000-per-month');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': 'https://www.myinvestmentcalculator.in/blog' },
        { '@type': 'ListItem', 'position': 3, 'name': '₹5000 SIP Per Month', 'item': 'https://www.myinvestmentcalculator.in/blog/sip-5000-per-month' }
      ]
    }, 'sip-5000-breadcrumb');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': this.title,
      'description': this.description,
      'datePublished': '2026-01-20',
      'dateModified': '2026-01-20',
      'author': { '@type': 'Organization', 'name': 'Finance Calculator India' },
      'publisher': { '@type': 'Organization', 'name': 'Finance Calculator India', 'url': 'https://www.myinvestmentcalculator.in' }
    }, 'sip-5000-article');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/blog/sip-5000-per-month');
    this.seo.updateFAQSchema([
      { question: 'How much will ₹5,000/month SIP give after 10 years?', answer: 'At 12% annual return, ₹5,000/month SIP for 10 years grows to approximately ₹11.6 lakh. Total invested: ₹6 lakh, estimated gains: ₹5.6 lakh.' },
      { question: 'How much will ₹5,000/month SIP give after 20 years?', answer: 'At 12% annual return, ₹5,000/month SIP for 20 years grows to approximately ₹49.96 lakh (almost ₹50 lakh). Total invested: ₹12 lakh, estimated gains: ₹37.96 lakh.' },
      { question: 'Is ₹5,000 a good SIP amount to start with?', answer: 'Yes, ₹5,000/month is an excellent starting SIP amount. It is affordable for most middle-class Indian earners, benefits from rupee cost averaging, and with consistency, can build significant wealth over 15–20 years.' },
      { question: 'What mutual fund should I choose for ₹5,000 SIP?', answer: 'For a 10+ year horizon, a large-cap index fund (like Nifty 50) or a flexi-cap fund is a good starting point. For higher risk tolerance, mid-cap or small-cap funds may offer better returns but with more volatility.' },
      { question: 'Should I increase my SIP amount over time?', answer: 'Yes, a step-up SIP (increasing contribution by 10% each year) significantly boosts your final corpus. Starting at ₹5,000 with 10% annual step-up can double your final corpus compared to a flat ₹5,000 SIP.' }
    ]);
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('sip-5000-breadcrumb');
    this.seo.removeJsonLd('sip-5000-article');
    this.seo.removeFAQSchema();
  }
}
