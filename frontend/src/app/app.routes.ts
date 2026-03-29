import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Best SIP Calculator India 2026 – EMI, FD & CAGR',
    loadComponent: () =>
      import('./components/home/home').then(m => m.HomeComponent)
  },
  {
    path: 'sip-calculator',
    title: 'SIP Calculator India – Calculate Monthly SIP Returns Online Free 2026',
    loadComponent: () =>
      import('./components/sip-calculator/sip-calculator').then(m => m.SipCalculator)
  },
  {
    path: 'emi-calculator',
    title: 'EMI Calculator India 2026 – Home & Car Loan EMI',
    loadComponent: () =>
      import('./components/emi-calculator/emi-calculator').then(m => m.EmiCalculator)
  },
  {
    path: 'fd-calculator',
    title: 'FD Calculator India 2026 – Fixed Deposit Interest Calculator SBI HDFC ICICI',
    loadComponent: () =>
      import('./components/fd-calculator/fd-calculator').then(m => m.FdCalculator)
  },
  {
    path: 'cagr-calculator',
    title: 'CAGR Calculator India – Stock Return & Annual Growth Rate Calculator 2026',
    loadComponent: () =>
      import('./components/cagr-calculator/cagr-calculator').then(m => m.CagrCalculator)
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
