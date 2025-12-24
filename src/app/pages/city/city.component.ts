import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CityService } from '../../core/services/city.service';
import { UserService } from '../../core/services/user.service';
import { PersonalizationService } from '../../core/services/personalization.service';
import { CityDetails, CitySection, City } from '../../core/models/city.model';
import { CityCardComponent } from '../../shared/components/city-card/city-card.component';

/**
 * CityComponent - The storytelling city experience
 * 
 * Design Philosophy:
 * - Progressive narrative: introduce → discover → explore
 * - Each section is a chapter in the city's story
 * - Non-intrusive storytelling: always serving clarity
 * 
 * "L'utente vive un percorso di scoperta"
 */
@Component({
  selector: 'app-city',
  standalone: true,
  imports: [CommonModule, RouterModule, CityCardComponent],
  template: `
    @if (loading()) {
      <div class="loading-state">
        <div class="loader"></div>
        <p>Preparando il tuo viaggio...</p>
      </div>
    } @else if (city()) {
      <main class="city-page">
        <!-- Hero Section - Emotional Introduction -->
        <section class="hero">
          <div class="hero-image">
            <img [src]="city()!.heroImage" [alt]="city()!.name">
            <div class="hero-overlay"></div>
          </div>
          
          <div class="hero-content">
            <div class="hero-breadcrumb animate-fade-in">
              <a routerLink="/">Home</a>
              <span class="separator">/</span>
              <a routerLink="/destinations">Destinazioni</a>
              <span class="separator">/</span>
              <span>{{ city()!.continent }}</span>
            </div>

            <div class="hero-text animate-fade-in-up">
              <h1>{{ city()!.name }}</h1>
              <p class="location">
                <span class="flag">🌍</span>
                {{ city()!.country }}
              </p>
              <p class="tagline">{{ city()!.tagline }}</p>
            </div>

            <div class="hero-meta animate-fade-in-up animate-delay-1">
              <div class="meta-item">
                <span class="meta-value">★ {{ city()!.rating }}</span>
                <span class="meta-label">Valutazione</span>
              </div>
              <div class="meta-item">
                <span class="meta-value">{{ city()!.suggestedDays.min }}-{{ city()!.suggestedDays.max }}</span>
                <span class="meta-label">Giorni consigliati</span>
              </div>
              <div class="meta-item">
                <span class="meta-value">{{ getPriceLevel() }}</span>
                <span class="meta-label">Costo medio</span>
              </div>
              <div class="meta-item">
                <span class="meta-value">{{ city()!.bestPeriod.slice(0, 2).join(', ') }}</span>
                <span class="meta-label">Periodo migliore</span>
              </div>
            </div>

            <div class="hero-actions animate-fade-in-up animate-delay-2">
              @if (userService.isAuthenticated()) {
                <button 
                  class="btn btn-primary btn-lg"
                  [class.saved]="isSaved()"
                  (click)="toggleSave()">
                  {{ isSaved() ? '❤️ Salvata' : '🤍 Salva' }}
                </button>
              }
              <button class="btn btn-secondary btn-lg" (click)="scrollToSection('overview')">
                Inizia l'esplorazione
              </button>
            </div>
          </div>

          <div class="scroll-hint animate-fade-in animate-delay-3">
            <span>Scorri per scoprire</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </div>
        </section>

        <!-- Story Introduction -->
        <section class="story-intro" id="overview">
          <div class="container">
            <div class="story-grid">
              <div class="story-content animate-fade-in-up">
                <span class="story-label">La Storia</span>
                <h2>{{ details()!.story.intro }}</h2>
                <p class="story-atmosphere">{{ details()!.story.atmosphere }}</p>
                <p class="story-unique">
                  <strong>Cosa la rende unica:</strong> {{ details()!.story.uniqueAspect }}
                </p>
              </div>
              <div class="story-side animate-fade-in-up animate-delay-1">
                <div class="traveller-types">
                  <h4>Perfetta per</h4>
                  <div class="type-tags">
                    @for (type of details()!.story.travellerTypes; track type) {
                      <span class="type-tag">{{ type }}</span>
                    }
                  </div>
                </div>
                <div class="quick-info">
                  <div class="info-item">
                    <span class="info-icon">🗣️</span>
                    <span class="info-text">{{ city()!.language.join(', ') }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-icon">💱</span>
                    <span class="info-text">{{ city()!.currency }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-icon">🕐</span>
                    <span class="info-text">{{ city()!.timezone }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Navigation Tabs -->
        <nav class="section-nav" [class.stuck]="navStuck()">
          <div class="container">
            <div class="nav-scroll">
              @for (section of details()!.sections; track section.id) {
                <button 
                  class="nav-tab"
                  [class.active]="activeSection() === section.id"
                  (click)="setActiveSection(section.id)">
                  <span class="tab-icon">{{ section.icon }}</span>
                  <span class="tab-label">{{ section.title }}</span>
                </button>
              }
              <button 
                class="nav-tab"
                [class.active]="activeSection() === 'practical'"
                (click)="setActiveSection('practical')">
                <span class="tab-icon">📋</span>
                <span class="tab-label">Info Pratiche</span>
              </button>
            </div>
          </div>
        </nav>

        <!-- Content Sections -->
        <div class="sections-container">
          @for (section of details()!.sections; track section.id) {
            <section 
              class="content-section"
              [id]="section.id"
              [class.active]="activeSection() === section.id">
              <div class="container">
                <div class="section-header">
                  <span class="section-icon">{{ section.icon }}</span>
                  <h2>{{ section.title }}</h2>
                </div>
                
                <div class="section-items">
                  @for (item of section.items; track item.id; let i = $index) {
                    <article 
                      class="item-card animate-fade-in-up"
                      [style.animation-delay.ms]="i * 100"
                      (click)="trackSectionExplored(section.id)">
                      @if (item.image) {
                        <div class="item-image">
                          <div class="image-placeholder skeleton"></div>
                        </div>
                      }
                      <div class="item-content">
                        <h3>{{ item.title }}</h3>
                        <p>{{ item.description }}</p>
                        <div class="item-meta">
                          @if (item.duration) {
                            <span class="meta-tag">
                              <span>⏱️</span> {{ item.duration }}
                            </span>
                          }
                          @if (item.priceRange) {
                            <span class="meta-tag">
                              <span>💰</span> {{ item.priceRange }}
                            </span>
                          }
                          @if (item.location) {
                            <span class="meta-tag">
                              <span>📍</span> {{ item.location }}
                            </span>
                          }
                        </div>
                      </div>
                    </article>
                  }
                </div>
              </div>
            </section>
          }

          <!-- Practical Info Section -->
          <section 
            class="content-section practical-section"
            id="practical"
            [class.active]="activeSection() === 'practical'">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">📋</span>
                <h2>Informazioni Pratiche</h2>
              </div>

              <div class="practical-grid">
                <div class="practical-card animate-fade-in-up">
                  <h3>📄 Documenti</h3>
                  <p>{{ details()!.practicalInfo.documents }}</p>
                </div>

                <div class="practical-card animate-fade-in-up animate-delay-1">
                  <h3>☀️ Periodo Migliore</h3>
                  <p>{{ details()!.practicalInfo.bestTimeToVisit }}</p>
                </div>

                <div class="practical-card animate-fade-in-up animate-delay-2">
                  <h3>💰 Costi Medi</h3>
                  <ul class="cost-list">
                    <li><span>Pasto:</span> {{ details()!.practicalInfo.averageCosts.meal }}</li>
                    <li><span>Trasporti:</span> {{ details()!.practicalInfo.averageCosts.transport }}</li>
                    <li><span>Alloggio:</span> {{ details()!.practicalInfo.averageCosts.accommodation }}</li>
                  </ul>
                </div>

                <div class="practical-card animate-fade-in-up animate-delay-3">
                  <h3>🚌 Come Muoversi</h3>
                  <ul>
                    @for (tip of details()!.practicalInfo.gettingAround; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>

                <div class="practical-card full-width animate-fade-in-up animate-delay-4">
                  <h3>💡 Consigli dai Locali</h3>
                  <div class="tips-grid">
                    @for (tip of details()!.practicalInfo.tipsFromLocals; track tip) {
                      <div class="tip-item">
                        <span class="tip-icon">✨</span>
                        <span>{{ tip }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Safety Section -->
          <section class="content-section safety-section">
            <div class="container">
              <div class="safety-card">
                <div class="safety-header">
                  <span class="safety-level" [attr.data-level]="details()!.safety.overallLevel">
                    {{ getSafetyLabel() }}
                  </span>
                  <h3>🛡️ Sicurezza</h3>
                </div>
                
                @if (details()!.safety.currentAlerts.length > 0) {
                  <div class="alerts">
                    @for (alert of details()!.safety.currentAlerts; track alert) {
                      <div class="alert-item">⚠️ {{ alert }}</div>
                    }
                  </div>
                }

                <div class="safety-grid">
                  <div class="safety-item">
                    <h4>Consigli Salute</h4>
                    <ul>
                      @for (tip of details()!.safety.healthTips; track tip) {
                        <li>{{ tip }}</li>
                      }
                    </ul>
                  </div>
                  <div class="safety-item">
                    <h4>Truffe da Evitare</h4>
                    <ul>
                      @for (scam of details()!.safety.scamsToAvoid; track scam) {
                        <li>{{ scam }}</li>
                      }
                    </ul>
                  </div>
                </div>

                <div class="emergency-contacts">
                  <span>Emergenze:</span>
                  <span>Polizia {{ details()!.safety.emergencyContacts.police }}</span>
                  <span>Medico {{ details()!.safety.emergencyContacts.medical }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Viral Content -->
        @if (details()!.viralContent.length > 0) {
          <section class="viral-section">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">📱</span>
                <h2>Trending sui Social</h2>
              </div>
              <div class="viral-grid">
                @for (content of details()!.viralContent; track content.id) {
                  <a 
                    [href]="content.externalUrl" 
                    target="_blank" 
                    rel="noopener"
                    class="viral-card"
                    (click)="trackExternalClick('viral', content.platform)">
                    <div class="viral-badge">{{ getPlatformIcon(content.platform) }}</div>
                    <div class="viral-info">
                      <span class="viral-title">{{ content.title }}</span>
                      <span class="viral-meta">{{ content.creator }} · {{ content.views }} views</span>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        <!-- Flight Deals -->
        @if (details()!.flightDeals.length > 0) {
          <section class="deals-section">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">✈️</span>
                <h2>Offerte Voli</h2>
              </div>
              <div class="deals-grid">
                @for (deal of details()!.flightDeals; track deal.id) {
                  <a 
                    [href]="deal.redirectUrl" 
                    target="_blank" 
                    rel="noopener"
                    class="deal-card"
                    (click)="trackExternalClick('flight', deal.provider)">
                    <div class="deal-price">
                      <span class="price">{{ deal.currency }} {{ deal.price }}</span>
                      <span class="price-label">da</span>
                    </div>
                    <div class="deal-info">
                      <span class="deal-route">{{ deal.departureCity }} → {{ city()!.name }}</span>
                      <span class="deal-dates">{{ deal.dates }}</span>
                    </div>
                    <span class="deal-provider">{{ deal.provider }}</span>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        <!-- Similar Cities -->
        @if (similarCities().length > 0) {
          <section class="similar-section">
            <div class="container">
              <div class="section-header">
                <h2>Destinazioni Simili</h2>
                <p class="section-subtitle">Ti potrebbe piacere anche</p>
              </div>
              <div class="similar-grid">
                @for (similar of similarCities(); track similar.id) {
                  <app-city-card [city]="similar" />
                }
              </div>
            </div>
          </section>
        }
      </main>
    } @else {
      <div class="error-state">
        <h2>Città non trovata</h2>
        <p>La destinazione che cerchi non esiste o è stata rimossa.</p>
        <a routerLink="/" class="btn btn-primary">Torna alla Home</a>
      </div>
    }
  `,
  styles: [`
    // ===== LOADING & ERROR STATES =====
    .loading-state,
    .error-state {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--space-8);
    }

    .loader {
      width: 48px;
      height: 48px;
      border: 3px solid var(--color-gray-200);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: var(--space-4);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    // ===== HERO =====
    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: var(--space-8);
      padding-bottom: var(--space-16);
    }

    .hero-image {
      position: absolute;
      inset: 0;
      z-index: -1;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.8) 0%,
        rgba(0, 0, 0, 0.3) 50%,
        rgba(0, 0, 0, 0.2) 100%
      );
    }

    .hero-content {
      max-width: var(--max-width);
      margin: 0 auto;
      width: 100%;
      color: white;
    }

    .hero-breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      margin-bottom: var(--space-6);
      opacity: 0.8;

      a:hover {
        text-decoration: underline;
      }

      .separator {
        opacity: 0.5;
      }
    }

    .hero-text {
      margin-bottom: var(--space-8);

      h1 {
        font-size: var(--text-5xl);
        color: white;
        margin-bottom: var(--space-2);

        @media (min-width: 768px) {
          font-size: 4rem;
        }
      }

      .location {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-lg);
        opacity: 0.9;
        margin-bottom: var(--space-4);
      }

      .tagline {
        font-size: var(--text-xl);
        font-style: italic;
        opacity: 0.85;
        max-width: 600px;
      }
    }

    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-6);
      margin-bottom: var(--space-8);
      padding: var(--space-4);
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: var(--border-radius-lg);
      width: fit-content;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);

      .meta-value {
        font-size: var(--text-lg);
        font-weight: 600;
      }

      .meta-label {
        font-size: var(--text-xs);
        opacity: 0.7;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }

    .hero-actions {
      display: flex;
      gap: var(--space-3);
    }

    .scroll-hint {
      position: absolute;
      bottom: var(--space-8);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      color: white;
      opacity: 0.7;
      font-size: var(--text-sm);

      svg {
        animation: bounce 2s infinite;
      }

      @media (max-width: 768px) {
        display: none;
      }
    }

    // ===== STORY INTRO =====
    .story-intro {
      padding: var(--space-24) 0;
      background: var(--color-off-white);
    }

    .story-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--space-12);

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
        gap: var(--space-8);
      }
    }

    .story-content {
      .story-label {
        display: inline-block;
        font-size: var(--text-sm);
        font-weight: 500;
        color: var(--color-accent);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: var(--space-4);
      }

      h2 {
        font-size: var(--text-3xl);
        line-height: 1.3;
        margin-bottom: var(--space-6);
      }

      .story-atmosphere {
        font-size: var(--text-lg);
        color: var(--color-gray-500);
        margin-bottom: var(--space-4);
      }

      .story-unique {
        color: var(--color-gray-400);
        border-left: 3px solid var(--color-accent);
        padding-left: var(--space-4);
      }
    }

    .story-side {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .traveller-types {
      background: var(--color-white);
      padding: var(--space-5);
      border-radius: var(--border-radius-lg);

      h4 {
        font-size: var(--text-sm);
        color: var(--color-gray-400);
        margin-bottom: var(--space-3);
      }
    }

    .type-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .type-tag {
      padding: var(--space-2) var(--space-3);
      background: var(--color-cream);
      border-radius: var(--border-radius-full);
      font-size: var(--text-sm);
      color: var(--color-gray-500);
    }

    .quick-info {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-sm);

      .info-icon {
        font-size: 1.2em;
      }

      .info-text {
        color: var(--color-gray-500);
      }
    }

    // ===== SECTION NAV =====
    .section-nav {
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
      background: var(--color-white);
      border-bottom: 1px solid var(--color-gray-100);
      transition: box-shadow var(--transition-base);

      &.stuck {
        box-shadow: var(--shadow-md);
      }
    }

    .nav-scroll {
      display: flex;
      gap: var(--space-1);
      overflow-x: auto;
      padding: var(--space-2) 0;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .nav-tab {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: none;
      border: none;
      border-radius: var(--border-radius-full);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-gray-500);
      white-space: nowrap;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-cream);
        color: var(--color-primary);
      }

      &.active {
        background: var(--color-primary);
        color: white;
      }
    }

    .tab-icon {
      font-size: 1.1em;
    }

    // ===== CONTENT SECTIONS =====
    .content-section {
      padding: var(--space-16) 0;

      &:nth-child(even) {
        background: var(--color-cream);
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-8);

      .section-icon {
        font-size: 2rem;
      }

      h2 {
        font-size: var(--text-2xl);
        margin: 0;
      }
    }

    .section-items {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-6);
    }

    .item-card {
      background: var(--color-white);
      border-radius: var(--border-radius-lg);
      overflow: hidden;
      transition: all var(--transition-base);
      cursor: pointer;

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
      }
    }

    .item-image {
      aspect-ratio: 16/9;
      overflow: hidden;

      .image-placeholder {
        width: 100%;
        height: 100%;
      }
    }

    .item-content {
      padding: var(--space-5);

      h3 {
        font-size: var(--text-lg);
        margin-bottom: var(--space-2);
      }

      p {
        font-size: var(--text-sm);
        color: var(--color-gray-500);
        margin-bottom: var(--space-3);
      }
    }

    .item-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .meta-tag {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      background: var(--color-cream);
      border-radius: var(--border-radius-sm);
      font-size: var(--text-xs);
      color: var(--color-gray-500);
    }

    // ===== PRACTICAL SECTION =====
    .practical-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-4);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .practical-card {
      background: var(--color-white);
      padding: var(--space-6);
      border-radius: var(--border-radius-lg);

      &.full-width {
        grid-column: 1 / -1;
      }

      h3 {
        font-size: var(--text-lg);
        margin-bottom: var(--space-3);
      }

      ul {
        list-style: none;

        li {
          padding: var(--space-2) 0;
          color: var(--color-gray-500);
          border-bottom: 1px solid var(--color-gray-100);

          &:last-child {
            border: none;
          }
        }
      }
    }

    .cost-list li {
      display: flex;
      justify-content: space-between;

      span:first-child {
        color: var(--color-gray-400);
      }
    }

    .tips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: var(--space-3);
    }

    .tip-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      color: var(--color-gray-500);

      .tip-icon {
        flex-shrink: 0;
      }
    }

    // ===== SAFETY SECTION =====
    .safety-section {
      background: var(--color-off-white);
    }

    .safety-card {
      background: var(--color-white);
      padding: var(--space-8);
      border-radius: var(--border-radius-xl);
    }

    .safety-header {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-6);

      h3 {
        margin: 0;
      }
    }

    .safety-level {
      padding: var(--space-2) var(--space-4);
      border-radius: var(--border-radius-full);
      font-size: var(--text-sm);
      font-weight: 600;

      &[data-level="very-safe"],
      &[data-level="safe"] {
        background: rgba(46, 204, 113, 0.1);
        color: #27ae60;
      }

      &[data-level="moderate"] {
        background: rgba(241, 196, 15, 0.1);
        color: #f39c12;
      }

      &[data-level="caution"],
      &[data-level="avoid"] {
        background: rgba(231, 76, 60, 0.1);
        color: #c0392b;
      }
    }

    .alerts {
      margin-bottom: var(--space-6);

      .alert-item {
        padding: var(--space-3);
        background: rgba(241, 196, 15, 0.1);
        border-radius: var(--border-radius-sm);
        font-size: var(--text-sm);
        color: #856404;
      }
    }

    .safety-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-6);
      margin-bottom: var(--space-6);

      @media (max-width: 576px) {
        grid-template-columns: 1fr;
      }

      h4 {
        font-size: var(--text-base);
        margin-bottom: var(--space-3);
      }

      ul {
        list-style: none;

        li {
          padding: var(--space-2) 0;
          color: var(--color-gray-500);
          font-size: var(--text-sm);

          &::before {
            content: '•';
            margin-right: var(--space-2);
            color: var(--color-gray-300);
          }
        }
      }
    }

    .emergency-contacts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-gray-100);
      font-size: var(--text-sm);
      color: var(--color-gray-500);
    }

    // ===== VIRAL SECTION =====
    .viral-section {
      padding: var(--space-16) 0;
      background: var(--color-primary);
      color: white;

      h2 {
        color: white;
      }
    }

    .viral-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
    }

    .viral-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: rgba(255, 255, 255, 0.1);
      border-radius: var(--border-radius-lg);
      transition: all var(--transition-base);

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        color: white;
      }
    }

    .viral-badge {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
      border-radius: var(--border-radius-md);
      font-size: 1.5rem;
    }

    .viral-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .viral-title {
      font-weight: 500;
    }

    .viral-meta {
      font-size: var(--text-xs);
      opacity: 0.7;
    }

    // ===== DEALS SECTION =====
    .deals-section {
      padding: var(--space-16) 0;
    }

    .deals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
    }

    .deal-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--color-white);
      border: 1px solid var(--color-gray-100);
      border-radius: var(--border-radius-lg);
      transition: all var(--transition-base);

      &:hover {
        border-color: var(--color-accent);
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
        color: inherit;
      }
    }

    .deal-price {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-right: var(--space-4);
      border-right: 1px solid var(--color-gray-100);

      .price {
        font-size: var(--text-xl);
        font-weight: 700;
        color: var(--color-accent);
      }

      .price-label {
        font-size: var(--text-xs);
        color: var(--color-gray-400);
      }
    }

    .deal-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .deal-route {
      font-weight: 500;
    }

    .deal-dates {
      font-size: var(--text-sm);
      color: var(--color-gray-400);
    }

    .deal-provider {
      font-size: var(--text-xs);
      color: var(--color-gray-400);
      background: var(--color-cream);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--border-radius-sm);
    }

    // ===== SIMILAR SECTION =====
    .similar-section {
      padding: var(--space-16) 0;
      background: var(--color-cream);

      .section-subtitle {
        color: var(--color-gray-400);
        margin-top: var(--space-2);
      }
    }

    .similar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-6);
    }
  `]
})
export class CityComponent implements OnInit, OnDestroy {
  // State
  loading = signal(true);
  city = signal<CityDetails | null>(null);
  details = computed(() => this.city());
  activeSection = signal('see');
  navStuck = signal(false);
  similarCities = signal<City[]>([]);

  // Computed
  isSaved = computed(() => {
    const cityId = this.city()?.id;
    return cityId ? this.userService.isCitySaved(cityId) : false;
  });

  private scrollListener: (() => void) | null = null;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: ActivatedRoute,
    private cityService: CityService,
    public userService: UserService,
    private personalization: PersonalizationService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const cityId = params.get('id');
      if (cityId) {
        this.loadCity(cityId);
      }
    });

    // Track scroll for sticky nav
    this.scrollListener = () => {
      this.navStuck.set(window.scrollY > 600);
    };
    window.addEventListener('scroll', this.scrollListener);
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }
  }

  private loadCity(cityId: string): void {
    this.loading.set(true);
    
    // Simulate API delay for realistic UX
    setTimeout(() => {
      const details = this.cityService.getCityDetails(cityId);
      
      if (details) {
        this.city.set(details);
        this.userService.trackCityVisit(cityId);
        this.similarCities.set(this.personalization.getSimilarCities(cityId, 4));
        
        // Start tracking time spent
        this.startTimeTracking(cityId);
      }
      
      this.loading.set(false);
    }, 300);
  }

  private startTimeTracking(cityId: string): void {
    // Track every 30 seconds
    this.trackingInterval = setInterval(() => {
      this.userService.trackCityVisit(cityId);
    }, 30000);
  }

  getPriceLevel(): string {
    const level = this.city()?.priceLevel || 3;
    const labels = ['Budget', 'Economico', 'Medio', 'Alto', 'Lusso'];
    return labels[level - 1];
  }

  getSafetyLabel(): string {
    const level = this.details()?.safety.overallLevel;
    const labels: Record<string, string> = {
      'very-safe': '✅ Molto sicura',
      'safe': '✅ Sicura',
      'moderate': '⚠️ Attenzione moderata',
      'caution': '⚠️ Cautela consigliata',
      'avoid': '🚫 Sconsigliata'
    };
    return labels[level || 'safe'];
  }

  getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      'tiktok': '📱',
      'instagram': '📸',
      'youtube': '▶️'
    };
    return icons[platform] || '🔗';
  }

  setActiveSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    this.scrollToSection(sectionId);
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for sticky nav
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  toggleSave(): void {
    const cityId = this.city()?.id;
    if (cityId) {
      if (this.isSaved()) {
        this.userService.unsaveCity(cityId);
      } else {
        this.userService.saveCity(cityId);
      }
    }
  }

  trackSectionExplored(sectionId: string): void {
    const cityId = this.city()?.id;
    if (cityId) {
      this.userService.trackSectionExplored(cityId, sectionId);
    }
  }

  trackExternalClick(type: string, target: string): void {
    const cityId = this.city()?.id;
    if (cityId) {
      this.userService.trackInteraction(cityId, {
        type: 'click_external',
        target: `${type}:${target}`
      });
    }
  }
}

