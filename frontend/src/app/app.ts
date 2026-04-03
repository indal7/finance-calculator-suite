import { Component, inject, afterNextRender, DestroyRef } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';
import { TrackingService } from './services/tracking.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly title = 'Finance Calculator Suite';

  constructor() {
    const tracking = inject(TrackingService);
    const router = inject(Router);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      tracking.init();

      // Fallback: force scroll-to-top on every navigation for edge cases
      router.events.pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef)
      ).subscribe(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
    });
  }
}
