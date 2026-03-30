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
    this.seo.setTitle('About Finance Calculator India | Built for Indian Investors');
    this.seo.setDescription('Learn why Finance Calculator India was created, who it helps, and how our simple tools support SIP, FD, and EMI planning for Indian users.');
    this.seo.setKeywords([
      'SIP calculator India',
      'monthly investment calculator India',
      'FD and EMI planning tools',
      'about finance calculator india'
    ]);
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/about-us');
    this.seo.updateOgTags(
      'About Finance Calculator India | Built for Indian Investors',
      'Learn why Finance Calculator India was created, who it helps, and how our simple tools support SIP, FD, and EMI planning for Indian users.',
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
