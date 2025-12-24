import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CityCardComponent } from '../../shared/components/city-card/city-card.component';
import { CityService } from '../../core/services/city.service';
import { UserService } from '../../core/services/user.service';
import { PersonalizationService } from '../../core/services/personalization.service';
import { City } from '../../core/models/city.model';

/**
 * HomeComponent - The heart of TravelStory
 * 
 * Design Philosophy:
 * - Esplorativa e ispirazionale
 * - Grafiche semplici ma d'impatto
 * - L'utente deve essere invogliato a esplorare
 * 
 * Progressive Disclosure:
 * - New users see trending + emerging destinations
 * - Returning users see personalized recommendations
 * - Registered users get the full experience
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CityCardComponent],
  template: `
    <main class="home">
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-background">
          <div class="hero-gradient"></div>
          <div class="hero-pattern"></div>
        </div>
        
        <div class="hero-content">
          <h1 class="hero-title animate-fade-in-up">
            {{ personalization.getPersonalizedGreeting() }}
          </h1>
          <p class="hero-subtitle animate-fade-in-up animate-delay-1">
            Scopri destinazioni che raccontano storie.<br>
            <span class="highlight">Trova la tua prossima avventura.</span>
          </p>

          <!-- Search Bar -->
          <div class="search-wrapper animate-fade-in-up animate-delay-2">
            <div class="search-bar">
              <svg class="search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input 
                type="text" 
                placeholder="Dove vuoi andare?"
                class="search-input"
                [(ngModel)]="searchQuery"
                (input)="onSearch()">
              @if (searchQuery()) {
                <button class="search-clear" (click)="clearSearch()">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              }
            </div>

            <!-- Quick Filters -->
            <div class="quick-filters">
              @for (filter of quickFilters; track filter.id) {
                <button 
                  class="filter-chip"
                  [class.active]="activeFilter() === filter.id"
                  (click)="setFilter(filter.id)">
                  <span class="filter-icon">{{ filter.icon }}</span>
                  <span class="filter-label">{{ filter.label }}</span>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Scroll Indicator -->
        <div class="scroll-indicator animate-fade-in animate-delay-3">
          <span>Scorri per esplorare</span>
          <div class="scroll-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </div>
        </div>
      </section>

      <!-- Search Results (if searching) -->
      @if (searchQuery() && searchResults().length > 0) {
        <section class="section results-section">
          <div class="container">
            <div class="section-header">
              <h2>Risultati per "{{ searchQuery() }}"</h2>
              <span class="results-count">{{ searchResults().length }} destinazioni</span>
            </div>
            <div class="city-grid">
              @for (city of searchResults(); track city.id; let i = $index) {
                <app-city-card 
                  [city]="city" 
                  class="animate-fade-in-up"
                  [style.animation-delay.ms]="i * 50"/>
              }
            </div>
          </div>
        </section>
      }

      <!-- Personalized Section (for returning users) -->
      @if (showPersonalized() && !searchQuery()) {
        <section class="section personalized-section">
          <div class="container">
            <div class="section-header">
              <div class="section-title-group">
                <span class="section-badge">✨ Consigliato per te</span>
                <h2>Destinazioni su misura</h2>
                <p class="section-subtitle">Basato sui tuoi interessi e le tue esplorazioni</p>
              </div>
            </div>
            <div class="city-grid featured">
              @for (city of recommendedCities(); track city.id; let i = $index) {
                <app-city-card 
                  [city]="city" 
                  [featured]="i === 0"
                  [recommendation]="getRecommendationReason(city)"
                  class="animate-fade-in-up"
                  [style.animation-delay.ms]="i * 100"/>
              }
            </div>
          </div>
        </section>
      }

      <!-- Recently Viewed (for returning users) -->
      @if (recentCities().length > 0 && !searchQuery()) {
        <section class="section recent-section">
          <div class="container">
            <div class="section-header">
              <div class="section-title-group">
                <span class="section-badge">📍 Continua l'esplorazione</span>
                <h2>Hai visitato di recente</h2>
              </div>
              <a routerLink="/history" class="section-link">
                Vedi cronologia →
              </a>
            </div>
            <div class="scroll-row">
              @for (city of recentCities(); track city.id; let i = $index) {
                <app-city-card 
                  [city]="city"
                  class="animate-slide-in"
                  [style.animation-delay.ms]="i * 80"/>
              }
            </div>
          </div>
        </section>
      }

      <!-- Trending Destinations -->
      @if (!searchQuery()) {
        <section class="section trending-section">
          <div class="container">
            <div class="section-header">
              <div class="section-title-group">
                <span class="section-badge">🔥 Tendenze</span>
                <h2>Le mete del momento</h2>
                <p class="section-subtitle">Le destinazioni più amate dai viaggiatori</p>
              </div>
              <a routerLink="/trending" class="section-link">
                Vedi tutte →
              </a>
            </div>
            <div class="city-grid">
              @for (city of trendingCities(); track city.id; let i = $index) {
                <app-city-card 
                  [city]="city"
                  class="animate-fade-in-up"
                  [style.animation-delay.ms]="i * 80"/>
              }
            </div>
          </div>
        </section>
      }

      <!-- Emerging Destinations -->
      @if (!searchQuery()) {
        <section class="section emerging-section">
          <div class="container">
            <div class="section-header">
              <div class="section-title-group">
                <span class="section-badge">💎 Gemme nascoste</span>
                <h2>Mete emergenti</h2>
                <p class="section-subtitle">Scopri prima degli altri</p>
              </div>
            </div>
            <div class="city-grid horizontal">
              @for (city of emergingCities(); track city.id; let i = $index) {
                <app-city-card 
                  [city]="city"
                  class="animate-fade-in-up"
                  [style.animation-delay.ms]="i * 100"/>
              }
            </div>
          </div>
        </section>
      }

      <!-- Budget Friendly -->
      @if (!searchQuery()) {
        <section class="section budget-section">
          <div class="container">
            <div class="budget-wrapper">
              <div class="budget-content">
                <span class="section-badge light">💸 Viaggia di più, spendi meno</span>
                <h2>Viaggi low-cost</h2>
                <p>Destinazioni incredibili che non svuotano il portafoglio. Esperienze autentiche, prezzi accessibili.</p>
                <a routerLink="/budget" class="btn btn-primary btn-lg">
                  Esplora le offerte
                </a>
              </div>
              <div class="budget-cities">
                @for (city of budgetCities(); track city.id; let i = $index) {
                  <app-city-card 
                    [city]="city"
                    class="animate-fade-in-up"
                    [style.animation-delay.ms]="i * 100"/>
                }
              </div>
            </div>
          </div>
        </section>
      }

      <!-- CTA Section -->
      @if (!userService.isAuthenticated() && !searchQuery()) {
        <section class="section cta-section">
          <div class="container">
            <div class="cta-card">
              <div class="cta-content">
                <h2>Il sito si ricorda di te</h2>
                <p>
                  Crea un account gratuito per sbloccare consigli personalizzati,
                  salvare le tue destinazioni preferite e costruire il tuo profilo viaggiatore.
                </p>
                <div class="cta-actions">
                  <a routerLink="/register" class="btn btn-primary btn-lg">
                    Inizia ora — È gratis
                  </a>
                  <span class="cta-note">Nessuna carta richiesta</span>
                </div>
              </div>
              <div class="cta-visual">
                <div class="floating-cards">
                  <div class="float-card card-1">🗼 Parigi</div>
                  <div class="float-card card-2">🗻 Tokyo</div>
                  <div class="float-card card-3">🏖️ Bali</div>
                  <div class="float-card card-4">🌴 Lisbona</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      }

      <!-- Comparison Teaser -->
      @if (!searchQuery()) {
        <section class="section compare-section">
          <div class="container">
            <div class="compare-card">
              <div class="compare-icon">⚖️</div>
              <h3>Indeciso tra due città?</h3>
              <p>Confronta destinazioni fianco a fianco: costi, clima, attrazioni e molto altro.</p>
              <a routerLink="/compare" class="btn btn-secondary">
                Confronta destinazioni
              </a>
            </div>
          </div>
        </section>
      }
    </main>
  `,
  styles: [`
    .home {
      overflow-x: hidden;
    }

    // ===== HERO SECTION =====
    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: var(--header-height) var(--space-6) var(--space-16);
      text-align: center;
      overflow: hidden;
    }

    .hero-background {
      position: absolute;
      inset: 0;
      z-index: -1;
    }

    .hero-gradient {
      position: absolute;
      inset: 0;
      background: 
        radial-gradient(ellipse at 30% 20%, rgba(233, 69, 96, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 60%, rgba(248, 181, 0, 0.06) 0%, transparent 50%),
        linear-gradient(180deg, var(--color-off-white) 0%, var(--color-cream) 100%);
    }

    .hero-pattern {
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      opacity: 0.5;
    }

    .hero-content {
      max-width: 800px;
      z-index: 1;
    }

    .hero-title {
      font-size: var(--text-4xl);
      font-weight: 500;
      color: var(--color-primary);
      margin-bottom: var(--space-4);
      
      @media (min-width: 768px) {
        font-size: var(--text-5xl);
      }
    }

    .hero-subtitle {
      font-size: var(--text-lg);
      color: var(--color-gray-500);
      margin-bottom: var(--space-10);
      line-height: 1.6;

      .highlight {
        color: var(--color-accent);
        font-weight: 500;
      }
    }

    // Search
    .search-wrapper {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }

    .search-bar {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--color-white);
      border-radius: var(--border-radius-xl);
      box-shadow: var(--shadow-lg);
      padding: var(--space-2);
      margin-bottom: var(--space-4);
    }

    .search-icon {
      position: absolute;
      left: var(--space-5);
      color: var(--color-gray-300);
      pointer-events: none;
    }

    .search-input {
      flex: 1;
      padding: var(--space-4) var(--space-6);
      padding-left: var(--space-12);
      border: none;
      background: transparent;
      font-family: var(--font-body);
      font-size: var(--text-lg);
      color: var(--color-primary);
      outline: none;

      &::placeholder {
        color: var(--color-gray-300);
      }
    }

    .search-clear {
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

    // Quick Filters
    .quick-filters {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-2);
    }

    .filter-chip {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-4);
      background: var(--color-white);
      border: 1.5px solid var(--color-gray-200);
      border-radius: var(--border-radius-full);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      color: var(--color-gray-500);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }

      &.active {
        background: var(--color-accent);
        border-color: var(--color-accent);
        color: white;
      }
    }

    .filter-icon {
      font-size: 1.1em;
    }

    // Scroll Indicator
    .scroll-indicator {
      position: absolute;
      bottom: var(--space-8);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-gray-400);
      font-size: var(--text-sm);

      @media (max-width: 768px) {
        display: none;
      }
    }

    .scroll-arrow {
      animation: bounce 2s infinite;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(8px); }
      60% { transform: translateY(4px); }
    }

    // ===== SECTIONS =====
    .section {
      padding: var(--space-20) 0;

      @media (max-width: 768px) {
        padding: var(--space-12) 0;
      }
    }

    .section-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: var(--space-8);
      gap: var(--space-4);

      @media (max-width: 576px) {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    .section-title-group {
      h2 {
        font-size: var(--text-3xl);
        margin: var(--space-2) 0;
      }
    }

    .section-badge {
      display: inline-block;
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-accent);
      letter-spacing: 0.02em;

      &.light {
        color: var(--color-white);
        opacity: 0.9;
      }
    }

    .section-subtitle {
      color: var(--color-gray-400);
      font-size: var(--text-base);
      margin: 0;
    }

    .section-link {
      font-weight: 500;
      color: var(--color-accent);
      white-space: nowrap;

      &:hover {
        text-decoration: underline;
      }
    }

    .results-count {
      color: var(--color-gray-400);
      font-size: var(--text-sm);
    }

    // City Grids
    .city-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-6);

      &.featured {
        grid-template-columns: repeat(3, 1fr);

        app-city-card:first-child {
          grid-column: 1 / -1;

          @media (min-width: 992px) {
            grid-column: 1 / 2;
            grid-row: 1 / 3;
          }
        }

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      &.horizontal {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        gap: var(--space-4);
        padding-bottom: var(--space-4);
        margin: 0 calc(-1 * var(--space-6));
        padding: 0 var(--space-6) var(--space-4);

        &::-webkit-scrollbar {
          display: none;
        }

        app-city-card {
          flex: 0 0 320px;
          scroll-snap-align: start;
        }
      }

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .scroll-row {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      gap: var(--space-4);
      margin: 0 calc(-1 * var(--space-6));
      padding: 0 var(--space-6) var(--space-4);

      &::-webkit-scrollbar {
        display: none;
      }

      app-city-card {
        flex: 0 0 300px;
        scroll-snap-align: start;
      }
    }

    // ===== PERSONALIZED SECTION =====
    .personalized-section {
      background: linear-gradient(180deg, var(--color-cream) 0%, var(--color-off-white) 100%);
    }

    // ===== BUDGET SECTION =====
    .budget-section {
      background: var(--color-primary);
      color: var(--color-white);
    }

    .budget-wrapper {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: var(--space-12);
      align-items: center;

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
        gap: var(--space-8);
      }
    }

    .budget-content {
      h2 {
        color: var(--color-white);
        margin-bottom: var(--space-4);
      }

      p {
        color: var(--color-gray-300);
        margin-bottom: var(--space-6);
      }
    }

    .budget-cities {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-4);

      @media (max-width: 576px) {
        grid-template-columns: 1fr;
      }
    }

    // ===== CTA SECTION =====
    .cta-section {
      padding: var(--space-12) 0;
    }

    .cta-card {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-8);
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
      border-radius: var(--border-radius-xl);
      padding: var(--space-12);
      overflow: hidden;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        padding: var(--space-8);
      }
    }

    .cta-content {
      h2 {
        color: var(--color-white);
        font-size: var(--text-3xl);
        margin-bottom: var(--space-4);
      }

      p {
        color: var(--color-gray-300);
        margin-bottom: var(--space-6);
      }
    }

    .cta-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
    }

    .cta-note {
      font-size: var(--text-sm);
      color: var(--color-gray-400);
    }

    .cta-visual {
      position: relative;
      min-height: 200px;

      @media (max-width: 768px) {
        display: none;
      }
    }

    .floating-cards {
      position: absolute;
      inset: 0;
    }

    .float-card {
      position: absolute;
      background: var(--color-white);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--border-radius-md);
      font-weight: 500;
      box-shadow: var(--shadow-lg);
      animation: float 6s ease-in-out infinite;

      &.card-1 {
        top: 10%;
        left: 10%;
        animation-delay: 0s;
      }
      &.card-2 {
        top: 30%;
        right: 20%;
        animation-delay: 1s;
      }
      &.card-3 {
        bottom: 30%;
        left: 30%;
        animation-delay: 2s;
      }
      &.card-4 {
        bottom: 10%;
        right: 10%;
        animation-delay: 3s;
      }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-15px) rotate(3deg); }
    }

    // ===== COMPARE SECTION =====
    .compare-section {
      padding-bottom: var(--space-24);
    }

    .compare-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: var(--color-cream);
      border-radius: var(--border-radius-xl);
      padding: var(--space-12);
    }

    .compare-icon {
      font-size: 3rem;
      margin-bottom: var(--space-4);
    }

    .compare-card h3 {
      font-size: var(--text-2xl);
      margin-bottom: var(--space-3);
    }

    .compare-card p {
      color: var(--color-gray-500);
      max-width: 500px;
      margin-bottom: var(--space-6);
    }
  `]
})
export class HomeComponent implements OnInit {
  // Reactive state
  searchQuery = signal('');
  activeFilter = signal<string | null>(null);
  searchResults = signal<City[]>([]);
  
  // City data
  trendingCities = signal<City[]>([]);
  emergingCities = signal<City[]>([]);
  budgetCities = signal<City[]>([]);
  recommendedCities = signal<City[]>([]);
  recentCities = signal<City[]>([]);

  // Display logic
  showPersonalized = signal(false);

  quickFilters = [
    { id: 'adventure', icon: '🏔️', label: 'Avventura' },
    { id: 'relaxation', icon: '🏖️', label: 'Relax' },
    { id: 'cultural', icon: '🏛️', label: 'Cultura' },
    { id: 'foodie', icon: '🍝', label: 'Gastronomia' },
    { id: 'budget', icon: '💰', label: 'Low-cost' },
    { id: 'romantic', icon: '💕', label: 'Romantico' }
  ];

  constructor(
    private cityService: CityService,
    public userService: UserService,
    public personalization: PersonalizationService
  ) {}

  ngOnInit(): void {
    this.loadCities();
    this.checkPersonalization();
  }

  private loadCities(): void {
    this.trendingCities.set(this.cityService.getTrendingCities(6));
    this.emergingCities.set(this.cityService.getEmergingDestinations(4));
    this.budgetCities.set(this.cityService.getBudgetFriendlyCities(4));
    
    // Load personalized content
    if (this.personalization.shouldShowPersonalizedSection()) {
      this.recommendedCities.set(this.personalization.getRecommendations(4));
    }
    
    // Load recently viewed
    const recentIds = this.userService.getRecentlyViewedCities(5);
    const recentCities = recentIds
      .map(id => this.cityService.getCityById(id))
      .filter((city): city is City => city !== undefined);
    this.recentCities.set(recentCities);
  }

  private checkPersonalization(): void {
    const visibility = this.personalization.getSectionVisibility();
    this.showPersonalized.set(visibility.showRecommended);
  }

  onSearch(): void {
    const query = this.searchQuery();
    if (query.length >= 2) {
      const results = this.cityService.searchCities(query);
      this.searchResults.set(results);
    } else {
      this.searchResults.set([]);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  setFilter(filterId: string): void {
    if (this.activeFilter() === filterId) {
      this.activeFilter.set(null);
      this.searchResults.set([]);
    } else {
      this.activeFilter.set(filterId);
      const results = this.cityService.getCitiesByTag(filterId);
      this.searchResults.set(results);
    }
    this.searchQuery.set('');
  }

  getRecommendationReason(city: City): string {
    return this.personalization.getRecommendationReason(city);
  }
}

