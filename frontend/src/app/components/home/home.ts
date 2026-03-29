import { Component, inject, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnDestroy {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setTitle('Best SIP Calculator India 2026 – EMI, FD & CAGR');
    this.seo.setDescription('Use the best SIP calculator India to calculate ₹5,000 monthly returns, EMI, FD maturity & CAGR instantly. Free, accurate & India-specific financial tools.');
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/');
    this.seo.updateOgTags(
      'Best SIP Calculator India 2026 – EMI, FD & CAGR Calculator Online',
      'Use the best SIP calculator India to calculate ₹5,000 monthly returns, EMI, FD maturity & CAGR instantly. Free, accurate & India-specific financial tools.',
      'https://www.myinvestmentcalculator.in/'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Best SIP Calculator India 2026 – EMI, FD & CAGR Calculator Online',
      'url': 'https://www.myinvestmentcalculator.in/',
      'description': 'Use the best SIP calculator India to calculate ₹5,000 monthly returns, EMI, FD maturity & CAGR instantly. Free, accurate & India-specific financial tools.'
    }, 'home-webpage');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' }
      ]
    }, 'home-breadcrumb');
    this.seo.updateFAQSchema([
      {
        question: 'What is a SIP calculator?',
        answer: 'A SIP (Systematic Investment Plan) calculator is an online tool that helps you estimate the returns on your mutual fund SIP investments. Enter your monthly investment amount, expected annual return rate, and investment duration to instantly see the maturity value and total wealth gained through compounding.'
      },
      {
        question: 'What is an EMI calculator?',
        answer: 'An EMI (Equated Monthly Instalment) calculator helps you compute the fixed monthly repayment amount for a loan. Enter the loan amount, annual interest rate, and tenure to instantly calculate your EMI, total interest payable, and total repayment amount.'
      },
      {
        question: 'What is an FD calculator?',
        answer: 'An FD (Fixed Deposit) calculator helps you find out the maturity amount of your fixed deposit investment. Enter the principal amount, annual interest rate, tenure, and compounding frequency to see the interest earned and maturity value at banks like SBI, HDFC, and ICICI.'
      },
      {
        question: 'What is CAGR and how is it calculated?',
        answer: 'CAGR (Compound Annual Growth Rate) is the rate at which an investment grows annually over a specified period, assuming profits are reinvested. It is calculated as: CAGR = (Ending Value / Beginning Value)^(1 / Number of Years) − 1. Our free CAGR calculator makes this instant for any investment.'
      }
    ]);
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('home-webpage');
    this.seo.removeJsonLd('home-breadcrumb');
    this.seo.removeFAQSchema();
  }
}
