import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * AppComponent - Root application component
 * 
 * Provides the main layout structure with header, content area, and footer.
 * All page components are rendered via RouterOutlet.
 * Header and footer are hidden on auth pages (login/register).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <!-- Skip to main content link for accessibility -->
    <a href="#main-content" class="skip-link">Salta al contenuto principale</a>
    
    @if (!isAuthPage()) {
    <app-header />
    }
    <main id="main-content">
      <router-outlet />
    </main>
    @if (!isAuthPage()) {
    <app-footer />
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    router-outlet + * {
      flex: 1;
    }

    main {
      flex: 1;
    }

    /* Skip link - hidden by default, visible on focus */
    .skip-link {
      position: absolute;
      top: -100px;
      left: 0;
      z-index: 10000;
      padding: var(--space-3) var(--space-6);
      background: var(--color-accent);
      color: white;
      text-decoration: none;
      font-weight: 600;
      border-radius: 0 0 var(--border-radius-md) 0;
      transition: top var(--transition-fast);
      
      &:focus {
        top: 0;
        outline: 3px solid var(--color-highlight);
        outline-offset: 2px;
      }
    }
  `]
})
export class AppComponent {
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ),
    { initialValue: null }
  );

  isAuthPage = computed(() => {
    const url = this.currentUrl()?.url ?? this.router.url;
    return url.startsWith('/login') || url.startsWith('/register');
  });

  constructor(private router: Router) {}
}
