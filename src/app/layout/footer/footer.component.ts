import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * FooterComponent - Site footer
 * Clean, informative, non-intrusive
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="footer">
      <div class="footer-content">
        <!-- Brand -->
        <div class="footer-brand">
          <div class="logo">
            <span class="logo-icon">✈</span>
            <span class="logo-text">TravelStory</span>
          </div>
          <p class="tagline">Scopri il mondo, una storia alla volta.</p>
        </div>

        <!-- Links -->
        <div class="footer-links">
          <div class="link-group">
            <h4>Esplora</h4>
            <a routerLink="/destinations">Tutte le destinazioni</a>
            <a routerLink="/trending">Mete del momento</a>
            <a routerLink="/budget">Viaggi low-cost</a>
          </div>
          <div class="link-group">
            <h4>Supporto</h4>
            <a routerLink="/about">Chi siamo</a>
            <a routerLink="/contact">Contatti</a>
            <a routerLink="/faq">FAQ</a>
          </div>
          <div class="link-group">
            <h4>Legale</h4>
            <a routerLink="/privacy">Privacy</a>
            <a routerLink="/terms">Termini di servizio</a>
            <a routerLink="/cookies">Cookie policy</a>
          </div>
        </div>
      </div>

      <!-- Bottom -->
      <div class="footer-bottom">
        <p>&copy; {{ currentYear }} TravelStory. Fatto con ❤️ per i viaggiatori.</p>
        <div class="social">
          <a href="#" aria-label="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a href="#" aria-label="Twitter">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="#" aria-label="YouTube">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: var(--color-primary);
      color: var(--color-white);
      padding: var(--space-16) 0 var(--space-8);
    }

    .footer-content {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: var(--space-16);
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 0 var(--space-6);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: var(--space-10);
      }
    }

    .footer-brand {
      .logo {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-family: var(--font-display);
        font-size: var(--text-2xl);
        font-weight: 600;
        margin-bottom: var(--space-4);
      }

      .logo-icon {
        font-size: 1.2em;
      }

      .tagline {
        color: var(--color-gray-300);
        font-size: var(--text-sm);
        margin: 0;
      }
    }

    .footer-links {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-8);

      @media (max-width: 576px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .link-group {
      h4 {
        color: var(--color-white);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: var(--space-4);
      }

      a {
        display: block;
        color: var(--color-gray-300);
        font-size: var(--text-sm);
        padding: var(--space-1) 0;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--color-white);
        }
      }
    }

    .footer-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: var(--max-width);
      margin: 0 auto;
      padding: var(--space-8) var(--space-6) 0;
      margin-top: var(--space-12);
      border-top: 1px solid rgba(255, 255, 255, 0.1);

      @media (max-width: 576px) {
        flex-direction: column;
        gap: var(--space-4);
        text-align: center;
      }

      p {
        color: var(--color-gray-400);
        font-size: var(--text-sm);
        margin: 0;
      }
    }

    .social {
      display: flex;
      gap: var(--space-4);

      a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        color: var(--color-gray-400);
        border-radius: 50%;
        transition: all var(--transition-fast);

        &:hover {
          color: var(--color-white);
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}

