import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, RenderMode } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(
      withRoutes([
        { path: '', renderMode: RenderMode.Prerender },
        { path: 'sip-calculator', renderMode: RenderMode.Prerender },
        { path: 'emi-calculator', renderMode: RenderMode.Prerender },
        { path: 'fd-calculator', renderMode: RenderMode.Prerender },
        { path: 'cagr-calculator', renderMode: RenderMode.Prerender },
        { path: '**', renderMode: RenderMode.Server }
      ])
    )
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
