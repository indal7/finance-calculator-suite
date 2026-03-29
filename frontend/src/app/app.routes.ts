import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home').then(m => m.HomeComponent)
  },
  {
    path: 'sip-calculator',
    loadComponent: () =>
      import('./components/sip-calculator/sip-calculator').then(m => m.SipCalculator)
  },
  {
    path: 'emi-calculator',
    loadComponent: () =>
      import('./components/emi-calculator/emi-calculator').then(m => m.EmiCalculator)
  },
  {
    path: 'fd-calculator',
    loadComponent: () =>
      import('./components/fd-calculator/fd-calculator').then(m => m.FdCalculator)
  },
  {
    path: 'cagr-calculator',
    loadComponent: () =>
      import('./components/cagr-calculator/cagr-calculator').then(m => m.CagrCalculator)
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./components/privacy-policy/privacy-policy').then(m => m.PrivacyPolicyComponent)
  },
  {
    path: 'about-us',
    loadComponent: () =>
      import('./components/about-us/about-us').then(m => m.AboutUsComponent)
  },
  {
    path: 'contact-us',
    loadComponent: () =>
      import('./components/contact-us/contact-us').then(m => m.ContactUsComponent)
  },
  {
    path: 'terms-and-conditions',
    loadComponent: () =>
      import('./components/terms-conditions/terms-conditions').then(m => m.TermsConditionsComponent)
  }
];
