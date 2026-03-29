import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'sip-calculator', renderMode: RenderMode.Prerender },
  { path: 'emi-calculator', renderMode: RenderMode.Prerender },
  { path: 'fd-calculator', renderMode: RenderMode.Prerender },
  { path: 'cagr-calculator', renderMode: RenderMode.Prerender },
  { path: 'about-us', renderMode: RenderMode.Prerender },
  { path: 'contact-us', renderMode: RenderMode.Prerender },
  { path: 'privacy-policy', renderMode: RenderMode.Prerender },
  { path: 'terms-and-conditions', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Server }
];
