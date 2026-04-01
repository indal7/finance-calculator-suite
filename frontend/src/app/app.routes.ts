import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'SIP Calculator India 2026 – Free Online SIP Return Calculator for Mutual Funds',
    loadComponent: () =>
      import('./components/sip-calculator/sip-calculator').then(m => m.SipCalculator)
  },
  {
    path: 'sip-calculator',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'emi-calculator',
    title: 'EMI Calculator India 2026 – Free Home Loan, Car Loan & Personal Loan EMI Calculator',
    loadComponent: () =>
      import('./components/emi-calculator/emi-calculator').then(m => m.EmiCalculator)
  },
  {
    path: 'fd-calculator',
    title: 'FD Calculator India 2026 – SBI, HDFC, ICICI Fixed Deposit Interest & Maturity Calculator',
    loadComponent: () =>
      import('./components/fd-calculator/fd-calculator').then(m => m.FdCalculator)
  },
  {
    path: 'cagr-calculator',
    title: 'CAGR Calculator India 2026 – Free Compound Annual Growth Rate Calculator Online',
    loadComponent: () =>
      import('./components/cagr-calculator/cagr-calculator').then(m => m.CagrCalculator)
  },
  {
    path: 'ppf-calculator',
    title: 'PPF Calculator India 2026 – Public Provident Fund Returns Calculator',
    loadComponent: () =>
      import('./components/ppf-calculator/ppf-calculator').then(m => m.PpfCalculatorComponent)
  },
  {
    path: 'lumpsum-calculator',
    title: 'Lumpsum Calculator India 2026 – One-Time Investment Return Calculator',
    loadComponent: () =>
      import('./components/lumpsum-calculator/lumpsum-calculator').then(m => m.LumpsumCalculatorComponent)
  },
  {
    path: 'income-tax-calculator',
    title: 'Income Tax Calculator India FY 2026-27 – New vs Old Tax Regime',
    loadComponent: () =>
      import('./components/income-tax-calculator/income-tax-calculator').then(m => m.IncomeTaxCalculatorComponent)
  },
  {
    path: 'blog',
    title: 'Finance Blog – SIP, EMI, FD & Investment Tips India 2026',
    loadComponent: () =>
      import('./components/blog/blog-list/blog-list').then(m => m.BlogListComponent)
  },
  {
    path: 'blog/sip-vs-fd',
    title: 'SIP vs FD: Which is Better for Long-Term Wealth Creation in India?',
    loadComponent: () =>
      import('./components/blog/sip-vs-fd/sip-vs-fd').then(m => m.SipVsFdBlogComponent)
  },
  {
    path: 'blog/sip-5000-per-month',
    title: 'What Happens If You Invest ₹5,000 Per Month via SIP for 10, 20, 30 Years?',
    loadComponent: () =>
      import('./components/blog/sip-5000-per-month/sip-5000-per-month').then(m => m.Sip5000BlogComponent)
  },
  {
    path: 'blog/sip-1000-per-month',
    title: '₹1,000 SIP Per Month for 5, 10, 15, 20 Years: Returns, Strategy & Planning',
    loadComponent: () =>
      import('./components/blog/sip-1000-per-month/sip-1000-per-month').then(m => m.Sip1000BlogComponent)
  },
  {
    path: 'blog/emi-calculation-guide',
    title: 'Complete Guide to EMI Calculation in India: Formula, Examples & Tips',
    loadComponent: () =>
      import('./components/blog/emi-calculation-guide/emi-calculation-guide').then(m => m.EmiGuideBlogComponent)
  },
  {
    path: 'blog/50-lakh-home-loan-emi',
    title: '₹50 Lakh Home Loan EMI in 2026: SBI, HDFC, ICICI Comparison + Savings Tips',
    loadComponent: () =>
      import('./components/blog/50-lakh-home-loan-emi/50-lakh-home-loan-emi').then(m => m.HomeLoan50LakhEmiBlogComponent)
  },
  {
    path: 'blog/10-lakh-fd-interest',
    title: '₹10 Lakh FD Interest Per Month in 2026: SBI, HDFC, ICICI & Post Office Comparison',
    loadComponent: () =>
      import('./components/blog/10-lakh-fd-interest/10-lakh-fd-interest').then(m => m.Fd10LakhInterestBlogComponent)
  },
  {
    path: 'privacy-policy',
    title: 'Privacy Policy – Finance Calculator India',
    loadComponent: () =>
      import('./components/privacy-policy/privacy-policy').then(m => m.PrivacyPolicyComponent)
  },
  {
    path: 'about-us',
    title: 'About Us – Finance Calculator India',
    loadComponent: () =>
      import('./components/about-us/about-us').then(m => m.AboutUsComponent)
  },
  {
    path: 'contact-us',
    title: 'Contact Us – Finance Calculator India',
    loadComponent: () =>
      import('./components/contact-us/contact-us').then(m => m.ContactUsComponent)
  },
  {
    path: 'terms-and-conditions',
    title: 'Terms & Conditions – Finance Calculator India',
    loadComponent: () =>
      import('./components/terms-conditions/terms-conditions').then(m => m.TermsConditionsComponent)
  },
  // Canonical redirect: /terms-conditions → /terms-and-conditions
  {
    path: 'terms-conditions',
    redirectTo: 'terms-and-conditions',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
