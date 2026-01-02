import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { CityService } from '../../core/services/city.service';
import { City } from '../../core/models/city.model';

/**
 * HeaderComponent - Main navigation
 * 
 * Features:
 * - Responsive navigation with mobile menu
 * - User state awareness (guest vs registered)
 * - Scroll-aware styling
 * - Quick search access
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <header class="header" [class.scrolled]="isScrolled()" [class.menu-open]="mobileMenuOpen()">
      <div class="header-inner">
        <!-- Logo -->
        <a routerLink="/" class="logo">
          <span class="logo-icon">✈</span>
          <span class="logo-text">
            <span class="logo-travel">Travel</span>
            <span class="logo-story">Story</span>
          </span>
        </a>

        <!-- Desktop Navigation -->
        <nav class="nav-desktop">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            Esplora
          </a>
          <a routerLink="/destinations" routerLinkActive="active">
            Destinazioni
          </a>
          <a routerLink="/compare" routerLinkActive="active">
            Confronta
          </a>
        </nav>

        <!-- Right Section -->
        <div class="header-right">
          <!-- Search Button -->
          <button class="search-btn" (click)="toggleSearch()" aria-label="Cerca">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </button>

          <!-- User Area -->
          @if (userService.isAuthenticated()) {
            <div class="user-menu">
              <button class="user-btn" (click)="toggleUserMenu()">
                <span class="user-avatar">{{ userInitial() }}</span>
                <span class="user-name hide-mobile">{{ userService.userName() }}</span>
              </button>
              @if (userMenuOpen()) {
                <div class="dropdown">
                  <a routerLink="/profile" class="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Profilo
                  </a>
                  <a routerLink="/saved" class="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    Città Salvate
                  </a>
                  <a routerLink="/history" class="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Cronologia
                  </a>
                  <hr>
                  <button class="dropdown-item" (click)="logout()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Esci
                  </button>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/login" class="btn btn-ghost hide-mobile">Accedi</a>
            <a routerLink="/register" class="btn btn-primary">Inizia</a>
          }

          <!-- Mobile Menu Toggle -->
          <button 
            class="mobile-toggle hide-desktop" 
            (click)="toggleMobileMenu()"
            [attr.aria-expanded]="mobileMenuOpen()"
            aria-label="Menu">
            <span class="hamburger">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      @if (mobileMenuOpen()) {
        <div class="mobile-menu">
          <nav class="mobile-nav">
            <a routerLink="/" (click)="closeMobileMenu()">Esplora</a>
            <a routerLink="/destinations" (click)="closeMobileMenu()">Destinazioni</a>
            <a routerLink="/compare" (click)="closeMobileMenu()">Confronta</a>
            <hr>
            @if (!userService.isAuthenticated()) {
              <a routerLink="/login" (click)="closeMobileMenu()">Accedi</a>
            }
          </nav>
        </div>
      }

      <!-- Search Overlay -->
      @if (searchOpen()) {
        <div class="search-overlay" (click)="closeSearch()">
          <div class="search-container" (click)="$event.stopPropagation()">
            <div class="search-input-wrapper">
              <svg class="search-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            <input 
              type="text" 
              placeholder="Cerca una destinazione..."
              class="search-input"
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
                (keyup.escape)="closeSearch()"
                (keyup.enter)="goToFirstResult()"
                #searchInput>
              @if (searchQuery()) {
                <button class="search-clear-btn" (click)="clearSearch()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              }
            </div>
            
            <!-- Search Results -->
            @if (searchResults().length > 0) {
              <div class="search-results">
                @for (city of searchResults(); track city.id; let i = $index) {
                  <a 
                    [routerLink]="['/city', city.id]" 
                    class="search-result-item"
                    (click)="closeSearch()">
                    <div class="result-image">
                      <img [src]="city.thumbnailImage" [alt]="city.name">
                    </div>
                    <div class="result-info">
                      <span class="result-name">{{ city.name }}</span>
                      <span class="result-country">{{ city.country }}</span>
                    </div>
                    <div class="result-meta">
                      <span class="result-rating">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        {{ city.rating }}
                      </span>
                    </div>
                  </a>
                }
                <a routerLink="/destinations" class="search-view-all" (click)="closeSearch()">
                  Vedi tutte le destinazioni
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              </div>
            } @else if (searchQuery() && searchQuery().length >= 2) {
              <div class="search-no-results">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <p>Nessuna destinazione trovata per "{{ searchQuery() }}"</p>
                <a routerLink="/destinations" (click)="closeSearch()">Esplora tutte le destinazioni</a>
              </div>
            }
            
            <button class="search-close" (click)="closeSearch()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      }
    </header>
  `,
  styles: [`
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: var(--z-sticky);
      background: transparent;
      transition: all var(--transition-base);

      &.scrolled {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        box-shadow: var(--shadow-sm);
      }
    }

    .header-inner {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      max-width: var(--max-width);
      margin: 0 auto;
      padding: var(--space-4) var(--space-6);
      height: var(--header-height);
      gap: var(--space-4);
    }

    // Logo
    .logo {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-primary);
      transition: transform var(--transition-fast);
      justify-self: start;

      &:hover {
        transform: scale(1.02);
        color: var(--color-primary);
      }
    }

    .logo-icon {
      font-size: 1.5em;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }

    .logo-text {
      display: flex;
      gap: 0.15em;
    }

    .logo-travel {
      color: var(--color-primary);
    }

    .logo-story {
      color: var(--color-accent);
    }

    // Desktop Nav
    .nav-desktop {
      display: flex;
      gap: var(--space-8);
      justify-self: center;

      @media (max-width: 768px) {
        display: none;
      }

      a {
        position: relative;
        font-weight: 500;
        color: var(--color-gray-500);
        padding: var(--space-2) 0;

        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--color-accent);
          transition: width var(--transition-base);
        }

        &:hover, &.active {
          color: var(--color-primary);

          &::after {
            width: 100%;
          }
        }
      }
    }

    // Right Section
    .header-right {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      justify-self: end;
    }

    .search-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      color: var(--color-gray-500);
      border-radius: var(--border-radius-full);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-cream);
        color: var(--color-primary);
      }
    }

    // User Menu
    .user-menu {
      position: relative;
    }

    .user-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1);
      padding-right: var(--space-3);
      background: var(--color-cream);
      border: none;
      border-radius: var(--border-radius-full);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-gray-100);
      }
    }

    .user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--color-accent), var(--color-highlight));
      color: white;
      border-radius: 50%;
      font-weight: 600;
      font-size: var(--text-sm);
    }

    .user-name {
      font-weight: 500;
      color: var(--color-gray-500);
    }

    .dropdown {
      position: absolute;
      top: calc(100% + var(--space-2));
      right: 0;
      min-width: 200px;
      background: white;
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-lg);
      padding: var(--space-2);
      animation: fadeIn 0.2s ease;

      hr {
        margin: var(--space-2) 0;
        border: none;
        border-top: 1px solid var(--color-gray-100);
      }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border: none;
      background: none;
      text-align: left;
      font-size: var(--text-sm);
      color: var(--color-gray-500);
      border-radius: var(--border-radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-cream);
        color: var(--color-primary);
      }
    }

    // Mobile Toggle
    .mobile-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: none;
      border: none;
      cursor: pointer;
    }

    .hamburger {
      display: flex;
      flex-direction: column;
      gap: 4px;

      span {
        display: block;
        width: 20px;
        height: 2px;
        background: var(--color-primary);
        border-radius: 1px;
        transition: all var(--transition-fast);
      }
    }

    .menu-open .hamburger {
      span:nth-child(1) {
        transform: rotate(45deg) translate(4px, 4px);
      }
      span:nth-child(2) {
        opacity: 0;
      }
      span:nth-child(3) {
        transform: rotate(-45deg) translate(4px, -4px);
      }
    }

    // Mobile Menu
    .mobile-menu {
      position: absolute;
      top: var(--header-height);
      left: 0;
      right: 0;
      background: white;
      box-shadow: var(--shadow-lg);
      animation: fadeInUp 0.3s ease;
    }

    .mobile-nav {
      display: flex;
      flex-direction: column;
      padding: var(--space-4);

      a {
        padding: var(--space-3) var(--space-4);
        font-weight: 500;
        color: var(--color-gray-500);
        border-radius: var(--border-radius-sm);

        &:hover {
          background: var(--color-cream);
          color: var(--color-primary);
        }
      }

      hr {
        margin: var(--space-3) 0;
        border: none;
        border-top: 1px solid var(--color-gray-100);
      }
    }

    // Search Overlay
    .search-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
      animation: fadeIn 0.2s ease;
      z-index: var(--z-modal);
    }

    .search-container {
      position: relative;
      width: 100%;
      max-width: 600px;
      margin: 0 var(--space-4);
      animation: fadeInUp 0.3s ease;
      background: var(--color-white);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-xl);
      overflow: hidden;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input-icon {
      position: absolute;
      left: var(--space-5);
      color: var(--color-gray-300);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: var(--space-5) var(--space-6);
      padding-left: var(--space-12);
      padding-right: var(--space-12);
      font-family: var(--font-body);
      font-size: var(--text-lg);
      border: none;
      background: transparent;
      outline: none;

      &::placeholder {
        color: var(--color-gray-300);
      }
    }

    .search-clear-btn {
      position: absolute;
      right: var(--space-4);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--color-gray-100);
      border: none;
      border-radius: var(--border-radius-full);
      color: var(--color-gray-400);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-gray-200);
        color: var(--color-primary);
      }
    }

    .search-results {
      border-top: 1px solid var(--color-gray-100);
      max-height: 400px;
      overflow-y: auto;
    }

    .search-result-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-5);
      transition: background var(--transition-fast);
      cursor: pointer;

      &:hover {
        background: var(--color-cream);
      }
    }

    .result-image {
      width: 48px;
      height: 48px;
      border-radius: var(--border-radius-sm);
      overflow: hidden;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .result-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .result-name {
      font-weight: 500;
      color: var(--color-primary);
    }

    .result-country {
      font-size: var(--text-sm);
      color: var(--color-gray-400);
    }

    .result-meta {
      display: flex;
      align-items: center;
    }

    .result-rating {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-highlight);

      svg {
        fill: var(--color-highlight);
      }
    }

    .search-view-all {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-4);
      border-top: 1px solid var(--color-gray-100);
      font-weight: 500;
      color: var(--color-accent);
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-cream);
      }
    }

    .search-no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-8);
      text-align: center;

      svg {
        color: var(--color-gray-300);
        margin-bottom: var(--space-4);
      }

      p {
        color: var(--color-gray-500);
        margin-bottom: var(--space-3);
      }

      a {
        color: var(--color-accent);
        font-weight: 500;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }

    .search-close {
      position: absolute;
      right: calc(-1 * var(--space-12));
      top: var(--space-4);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: var(--border-radius-full);
      color: white;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      @media (max-width: 768px) {
        right: var(--space-2);
        top: calc(-1 * var(--space-12));
      }
    }

    // Responsive
    @media (max-width: 768px) {
      .header-inner {
        padding: var(--space-3) var(--space-4);
      }

      .logo-text {
        font-size: var(--text-lg);
      }
    }
  `]
})
export class HeaderComponent {
  isScrolled = signal(false);
  mobileMenuOpen = signal(false);
  searchOpen = signal(false);
  userMenuOpen = signal(false);
  searchQuery = signal('');
  searchResults = signal<City[]>([]);

  constructor(
    public userService: UserService,
    private cityService: CityService,
    private router: Router
  ) {}

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled.set(window.scrollY > 20);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close user menu when clicking outside
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.userMenuOpen.set(false);
    }
  }

  userInitial(): string {
    const name = this.userService.userName();
    return name.charAt(0).toUpperCase();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleSearch(): void {
    this.searchOpen.update(v => !v);
    if (this.searchOpen()) {
      this.searchQuery.set('');
      this.searchResults.set([]);
    }
  }

  closeSearch(): void {
    this.searchOpen.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  onSearch(): void {
    const query = this.searchQuery();
    if (query.length >= 2) {
      const results = this.cityService.searchCities(query).slice(0, 6);
      this.searchResults.set(results);
    } else {
      this.searchResults.set([]);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  goToFirstResult(): void {
    const results = this.searchResults();
    if (results.length > 0) {
      this.router.navigate(['/city', results[0].id]);
      this.closeSearch();
    }
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(v => !v);
  }

  logout(): void {
    this.userService.logout();
    this.userMenuOpen.set(false);
  }
}

