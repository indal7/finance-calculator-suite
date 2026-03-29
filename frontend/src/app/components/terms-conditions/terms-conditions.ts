import { Component, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-terms-conditions',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terms-conditions.html',
  styleUrls: ['./terms-conditions.css']
})
export class TermsConditionsComponent implements OnDestroy {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setTitle('Terms & Conditions – Finance Calculator India');
    this.seo.setDescription('Review the Terms & Conditions for using Finance Calculator India. Understand the limitations, disclaimers, and user responsibilities when using our free financial tools.');
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/terms-and-conditions');
    this.seo.updateOgTags(
      'Terms & Conditions – Finance Calculator India',
      'Review the Terms & Conditions for using Finance Calculator India. Understand the limitations, disclaimers, and user responsibilities.',
      'https://www.myinvestmentcalculator.in/terms-and-conditions'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Terms & Conditions – Finance Calculator India',
      'url': 'https://www.myinvestmentcalculator.in/terms-and-conditions',
      'description': 'Terms and Conditions for using Finance Calculator India calculators.'
    }, 'terms-webpage');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Terms & Conditions', 'item': 'https://www.myinvestmentcalculator.in/terms-and-conditions' }
      ]
    }, 'terms-breadcrumb');
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('terms-webpage');
    this.seo.removeJsonLd('terms-breadcrumb');
  }
}
