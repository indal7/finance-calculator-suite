import { Component, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './contact-us.html',
  styleUrls: ['./contact-us.css']
})
export class ContactUsComponent implements OnDestroy {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setTitle('Contact Us – Finance Calculator India');
    this.seo.setDescription('Get in touch with Finance Calculator India. Have a question, suggestion, or feedback? Reach us by email or use our contact form. We respond within 24–48 hours.');
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/contact-us');
    this.seo.updateOgTags(
      'Contact Us – Finance Calculator India',
      'Get in touch with Finance Calculator India. Have a question, suggestion, or feedback? Reach us by email or use our contact form.',
      'https://www.myinvestmentcalculator.in/contact-us'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      'name': 'Contact Us – Finance Calculator India',
      'url': 'https://www.myinvestmentcalculator.in/contact-us',
      'description': 'Contact Finance Calculator India for queries, suggestions, or feedback.'
    }, 'contact-webpage');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Contact Us', 'item': 'https://www.myinvestmentcalculator.in/contact-us' }
      ]
    }, 'contact-breadcrumb');
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('contact-webpage');
    this.seo.removeJsonLd('contact-breadcrumb');
  }
}
