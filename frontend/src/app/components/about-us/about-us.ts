import { Component, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about-us.html',
  styleUrls: ['./about-us.css']
})
export class AboutUsComponent implements OnDestroy {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setTitle('About Us – Finance Calculator India | Free Financial Tools');
    this.seo.setDescription('Learn about Finance Calculator India – our mission to empower Indian investors with free, accurate SIP, EMI, FD and CAGR calculators for smarter financial decisions.');
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/about-us');
    this.seo.updateOgTags(
      'About Us – Finance Calculator India | Free Financial Tools',
      'Learn about Finance Calculator India – our mission to empower Indian investors with free, accurate SIP, EMI, FD and CAGR calculators for smarter financial decisions.',
      'https://www.myinvestmentcalculator.in/about-us'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      'name': 'About Us – Finance Calculator India',
      'url': 'https://www.myinvestmentcalculator.in/about-us',
      'description': 'Finance Calculator India provides free, accurate financial calculators for Indian investors and loan seekers.'
    }, 'about-webpage');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'About Us', 'item': 'https://www.myinvestmentcalculator.in/about-us' }
      ]
    }, 'about-breadcrumb');
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('about-webpage');
    this.seo.removeJsonLd('about-breadcrumb');
  }
}
