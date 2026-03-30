import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Lightweight, non-blocking visit tracker.
 *
 * - Fires POST /track-visit on every client-side navigation (including initial page load).
 * - Skips on the server (SSR prerender) — only tracks real browser visits.
 * - Uses `navigator.sendBeacon` when available for zero-latency, non-blocking delivery.
 * - Falls back to a fire-and-forget HttpClient POST.
 * - Generates a per-session ID (sessionStorage) for session tracking.
 * - Never stores PII — the Lambda hashes the IP server-side.
 */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = `${environment.apiBase}/track-visit`;
  private sessionId = '';

  init(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.sessionId = this.getOrCreateSessionId();

    // Track initial page load
    this.trackVisit(window.location.href);

    // Track every subsequent client-side navigation
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.trackVisit(`${window.location.origin}${e.urlAfterRedirects}`);
      });
  }

  private trackVisit(pageUrl: string): void {
    const payload = {
      page_url: pageUrl,
      referrer: document.referrer || '',
      user_agent: navigator.userAgent || '',
      session_id: this.sessionId,
    };

    // Prefer sendBeacon — non-blocking, survives page unload, zero latency impact
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(this.apiUrl, blob);
      return;
    }

    // Fallback: fire-and-forget POST (no subscribe needed — Angular HttpClient
    // requires subscribe to trigger, so we subscribe and ignore the result)
    this.http.post(this.apiUrl, payload).subscribe({
      error: () => { /* silently ignore — tracking must never disrupt UX */ },
    });
  }

  private getOrCreateSessionId(): string {
    const key = 'fc_sid';
    let sid = '';
    try {
      sid = sessionStorage.getItem(key) || '';
    } catch { /* private browsing — ignore */ }

    if (!sid) {
      sid = this.generateId();
      try {
        sessionStorage.setItem(key, sid);
      } catch { /* ignore */ }
    }
    return sid;
  }

  private generateId(): string {
    // crypto.randomUUID is available in all modern browsers
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
      Math.floor(Math.random() * 16).toString(16)
    );
  }
}
