import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { formatIndian, formatCompact, scrollToTop, scrollToElement, getSliderPercent } from '../services/format.utils';

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

  // ── Abstract ──────────────────────────────────────────────────────────

  abstract readonly form: FormGroup;
  abstract readonly faqs: ReadonlyArray<{ q: string; a: string }>;
  abstract calculate(): void;

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
}
