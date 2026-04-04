import { ChangeDetectorRef, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { formatIndian, formatCompact, scrollToTop, scrollToElement, getSliderPercent } from '../services/format.utils';
import { ShareService, ShareRequest } from '../services/share.service';

/**
 * Abstract base class for all calculator components.
 *
 * Centralises shared logic: formatting helpers, slider sync, FAQ toggle,
 * copy-to-clipboard, scroll methods, and common state properties.
 *
 * Subclasses must provide their own `form`, `faqs`, and `calculate()`.
 */
export abstract class BaseCalculator {
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly shareSvc = inject(ShareService);
  protected readonly route = inject(ActivatedRoute);
  protected readonly cdr = inject(ChangeDetectorRef);

  /** FAQ accordion state */
  openFaq: number | null = null;

  /** Projection table expand state */
  showFullTable = false;

  /** Copy-to-clipboard feedback state */
  copied = false;
  protected copyTimer?: ReturnType<typeof setTimeout>;

  /** API call status */
  apiStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  apiError = '';

  /** Share link state */
  shareStatus: 'idle' | 'saving' | 'done' | 'error' = 'idle';
  shareUrl = '';
  shareError = '';

  // ── Abstract ──────────────────────────────────────────────────────────

  abstract readonly form: FormGroup;
  abstract readonly faqs: ReadonlyArray<{ q: string; a: string }>;
  abstract calculate(): void;
  abstract getSharePayload(): ShareRequest;

  // ── Shared formatting (delegate to pure functions) ────────────────────

  formatIndian(val: number): string { return formatIndian(val); }
  formatCompact(val: number): string { return formatCompact(val); }

  // ── Slider helpers ────────────────────────────────────────────────────

  get f() { return this.form.controls; }

  /** Sync range slider → patch form control value */
  syncFromSlider(field: string, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.form.get(field)?.setValue(val);
  }

  /** No-op — Angular's reactive [value] keeps slider in sync */
  syncSlider(_field: string): void {}

  /** Returns 0–100 percentage for slider fill gradient */
  getSliderPct(field: string, min: number, max: number): number {
    const val = this.form.get(field)?.value ?? min;
    return getSliderPercent(val, min, max);
  }

  // ── FAQ toggle ────────────────────────────────────────────────────────

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? null : index;
  }

  // ── Scroll helpers ────────────────────────────────────────────────────

  scrollToTop(): void {
    if (this.isBrowser) scrollToTop();
  }

  scrollToResult(): void {
    if (this.isBrowser) scrollToElement('.calc-result-panel');
  }

  // ── Copy-to-clipboard base ────────────────────────────────────────────

  protected copyText(text: string): void {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    this.copied = true;
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => { this.copied = false; }, 2200);
  }

  // ── CSV download for projection tables ────────────────────────────────

  downloadCSV(rows: Array<Record<string, any>>, filename: string): void {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map(row => headers.map(h => row[h]).join(','))
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Share results via backend ─────────────────────────────────────────

  shareResults(): void {
    if (!this.isBrowser) return;
    this.shareStatus = 'saving';
    this.shareUrl = '';
    this.shareError = '';

    const payload = this.getSharePayload();

    this.shareSvc.saveShare(payload).subscribe({
      next: (res) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.myinvestmentcalculator.in';
        this.shareUrl = `${origin}/share/${res.id}`;
        this.shareStatus = 'done';
        navigator.clipboard.writeText(this.shareUrl).catch(() => {});
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.shareError = err.message;
        this.shareStatus = 'error';
        this.cdr.markForCheck();
      }
    });
  }

  // ── Restore form from query params (shared link redirect) ─────────────

  protected restoreFromQueryParams(): boolean {
    const params = this.route.snapshot.queryParams;
    const keys = Object.keys(params);
    if (!keys.length) return false;

    const patch: Record<string, number> = {};
    for (const key of Object.keys(this.form.controls)) {
      if (params[key] !== undefined) {
        const val = parseFloat(params[key]);
        if (!isNaN(val) && isFinite(val) && val > 0) {
          patch[key] = val;
        }
      }
    }
    if (Object.keys(patch).length) {
      this.form.patchValue(patch);
      // Scroll to results after calculation renders (shared link)
      if (this.isBrowser) {
        setTimeout(() => scrollToElement('.calc-result-panel'), 600);
      }
      return true;
    }
    return false;
  }
}
