/**
 * Shared formatting & scroll utility functions used across all calculator components.
 * Centralised here to eliminate duplication (DRY).
 */

/** Format value in Indian notation (L / Cr) */
export function formatIndian(val: number): string {
  if (val >= 10_000_000) return (val / 10_000_000).toFixed(2) + ' Cr';
  if (val >= 100_000) return (val / 100_000).toFixed(2) + ' L';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toFixed(0);
}

/** Format summary strip values (compact with ₹ prefix) */
export function formatCompact(val: number): string {
  if (val >= 10_000_000) return '₹' + (val / 10_000_000).toFixed(1) + 'Cr';
  if (val >= 100_000) return '₹' + (val / 100_000).toFixed(1) + 'L';
  if (val >= 1_000) return '₹' + (val / 1_000).toFixed(0) + 'K';
  return '₹' + val.toFixed(0);
}

/** Smooth-scroll to the top of the page */
export function scrollToTop(): void {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/** Smooth-scroll to an element by CSS selector */
export function scrollToElement(selector: string, block: ScrollLogicalPosition = 'start'): void {
  if (typeof document !== 'undefined') {
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block });
  }
}

/** Returns 0–100 percentage for range-slider fill gradient */
export function getSliderPercent(value: number, min: number, max: number): number {
  return Math.round(((value - min) / (max - min)) * 100);
}

/** Returns SVG stroke-dashoffset for donut chart (circumference ≈ 220) */
export function getDonutOffset(invested: number, total: number): number {
  return 220 * (invested / total);
}
