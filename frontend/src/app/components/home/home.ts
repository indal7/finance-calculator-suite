import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setTitle('Free Investment Calculators India – SIP, EMI, FD & CAGR Tools | MyInvestmentCalculator.in');
    this.seo.setDescription('Plan your investments and loans easily using our free online calculators. No login required. Calculate SIP returns, EMI, FD maturity and CAGR instantly.');
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/');
    this.seo.updateOgTags(
      'Free Investment Calculators India – SIP, EMI, FD & CAGR Tools',
      'Plan your investments and loans easily using our free online calculators. No login required.',
      'https://www.myinvestmentcalculator.in/'
    );
  }
}
