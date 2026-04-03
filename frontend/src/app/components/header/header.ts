import { Component, ChangeDetectionStrategy, signal, afterNextRender, inject, DestroyRef } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.scrolled]': 'scrolled()',
    '(document:keydown.escape)': 'closeMenu()',
  }
})
export class HeaderComponent {
  menuOpen = signal(false);
  scrolled = signal(false);
  dropdownOpen = signal(false);

  constructor() {
    const router = inject(Router);
    const destroyRef = inject(DestroyRef);

    router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(() => this.closeMenu());

    afterNextRender(() => {
      const onScroll = () => this.scrolled.set(window.scrollY > 10);
      window.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
    this.setBodyScroll(this.menuOpen());
  }

  closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.setBodyScroll(false);
  }

  toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  private setBodyScroll(lock: boolean): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = lock ? 'hidden' : '';
    }
  }
}
