import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'sip-calculator', renderMode: RenderMode.Prerender },
  { path: 'emi-calculator', renderMode: RenderMode.Prerender },
  { path: 'fd-calculator', renderMode: RenderMode.Prerender },
  { path: 'cagr-calculator', renderMode: RenderMode.Prerender },
  { path: 'ppf-calculator', renderMode: RenderMode.Prerender },
  { path: 'lumpsum-calculator', renderMode: RenderMode.Prerender },
  { path: 'income-tax-calculator', renderMode: RenderMode.Prerender },
  { path: 'blog', renderMode: RenderMode.Prerender },
  { path: 'blog/sip-vs-fd', renderMode: RenderMode.Prerender },
  { path: 'blog/sip-5000-per-month', renderMode: RenderMode.Prerender },
  { path: 'blog/sip-1000-per-month', renderMode: RenderMode.Prerender },
  { path: 'blog/emi-calculation-guide', renderMode: RenderMode.Prerender },
  { path: 'blog/50-lakh-home-loan-emi', renderMode: RenderMode.Prerender },
  { path: 'blog/10-lakh-fd-interest', renderMode: RenderMode.Prerender },
  { path: 'about-us', renderMode: RenderMode.Prerender },
  { path: 'contact-us', renderMode: RenderMode.Prerender },
  { path: 'privacy-policy', renderMode: RenderMode.Prerender },
  { path: 'terms-and-conditions', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Server }
];
