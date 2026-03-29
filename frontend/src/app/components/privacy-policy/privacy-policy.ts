import { Component, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy-policy.html',
  styleUrls: ['./privacy-policy.css']
})
export class PrivacyPolicyComponent implements OnDestroy {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setTitle('Privacy Policy – Finance Calculator India');
    this.seo.setDescription('Read the Privacy Policy for Finance Calculator India. Learn how we collect, use, and protect your data, our use of Google AdSense cookies, and your rights.');
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/privacy-policy');
    this.seo.updateOgTags(
      'Privacy Policy – Finance Calculator India',
      'Read the Privacy Policy for Finance Calculator India. Learn how we collect, use, and protect your data, our use of Google AdSense cookies, and your rights.',
      'https://www.myinvestmentcalculator.in/privacy-policy'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Privacy Policy – Finance Calculator India',
      'url': 'https://www.myinvestmentcalculator.in/privacy-policy',
      'description': 'Read the Privacy Policy for Finance Calculator India.'
    }, 'privacy-webpage');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Privacy Policy', 'item': 'https://www.myinvestmentcalculator.in/privacy-policy' }
      ]
    }, 'privacy-breadcrumb');
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('privacy-webpage');
    this.seo.removeJsonLd('privacy-breadcrumb');
  }
}
