import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../../core/services/user.service';

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
  imports: [CommonModule, RouterModule],
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
                    <span>👤</span> Profilo
                  </a>
                  <a routerLink="/saved" class="dropdown-item">
                    <span>❤️</span> Città Salvate
                  </a>
                  <a routerLink="/history" class="dropdown-item">
                    <span>📍</span> Cronologia
                  </a>
                  <hr>
                  <button class="dropdown-item" (click)="logout()">
                    <span>🚪</span> Esci
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
            <input 
              type="text" 
              placeholder="Cerca una destinazione..."
              class="search-input"
              autofocus
              (keyup.escape)="closeSearch()">
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: var(--max-width);
      margin: 0 auto;
      padding: var(--space-4) var(--space-6);
      height: var(--header-height);
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
    }

    .search-input {
      width: 100%;
      padding: var(--space-5) var(--space-6);
      padding-right: var(--space-16);
      font-family: var(--font-body);
      font-size: var(--text-lg);
      border: none;
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-xl);
      outline: none;

      &::placeholder {
        color: var(--color-gray-300);
      }
    }

    .search-close {
      position: absolute;
      right: var(--space-4);
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: none;
      border: none;
      color: var(--color-gray-400);
      cursor: pointer;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-primary);
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

  constructor(public userService: UserService) {}

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
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(v => !v);
  }

  logout(): void {
    this.userService.logout();
    this.userMenuOpen.set(false);
  }
}

