import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService } from '../../services/share.service';

/** Calculator type → Angular route path */
const CALC_ROUTES: Record<string, string> = {
  sip:     '/',
  emi:     '/emi-calculator',
  fd:      '/fd-calculator',
  cagr:    '/cagr-calculator',
  lumpsum: '/lumpsum-calculator',
};

@Component({
  selector: 'app-share-redirect',
  standalone: true,
  template: `
    <div class="share-redirect">
      @if (error) {
        <div class="share-error">
          <div class="error-icon">🔗</div>
          <h2>Share Link Unavailable</h2>
          <p>{{ error }}</p>
          <a routerLink="/" class="btn-home">Go to Calculator</a>
        </div>
      } @else {
        <div class="share-loading">
          <div class="spinner"></div>
          <p>Loading shared calculation...</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .share-redirect { display: flex; justify-content: center; align-items: center; min-height: 60vh; padding: 2rem; }
    .share-loading { text-align: center; color: #6c757d; }
    .spinner { width: 40px; height: 40px; margin: 0 auto 1rem; border: 3px solid #e9ecef; border-top-color: #00B386; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .share-error { text-align: center; max-width: 400px; }
    .error-icon { font-size: 3rem; margin-bottom: 1rem; }
    .share-error h2 { color: #343a40; margin-bottom: 0.5rem; }
    .share-error p { color: #6c757d; margin-bottom: 1.5rem; }
    .btn-home { display: inline-block; padding: 0.75rem 1.5rem; background: #00B386; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .btn-home:hover { background: #009973; }
  `],
  imports: []
})
export class ShareRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shareSvc = inject(ShareService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  error = '';

  ngOnInit(): void {
    // Only run redirect on the client — SSR would cause hydration mismatch
    if (!this.isBrowser) return;

    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) {
      this.error = 'Invalid share link.';
      return;
    }

    this.shareSvc.getShare(id).subscribe({
      next: (data) => {
        const routePath = CALC_ROUTES[data.calculator];
        if (!routePath) {
          this.error = 'Unknown calculator type.';
          return;
        }
        // Redirect to calculator page with sid param (new share URL format)
        this.router.navigate([routePath], {
          queryParams: { sid: data.id },
          replaceUrl: true
        });
      },
      error: (err) => {
        this.error = err.message;
      }
    });
  }
}
