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
    @if (!isAuthPage()) {
    <app-header />
    }
    <router-outlet />
    @if (!isAuthPage()) {
    <app-footer />
    }
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    router-outlet + * {
      display: block;
      height: 100%;
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
