import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CityService } from '../../core/services/city.service';
import { City, CityDetails } from '../../core/models/city.model';

type PracticalInfo = CityDetails['practicalInfo'];

/**
 * CompareComponent - Side-by-side city comparison
 * 
 * "Indeciso tra due città?"
 * Helps users make informed decisions by comparing key metrics.
 */
@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <main class="compare-page">
      <!-- Header -->
      <header class="page-header">
        <div class="container">
          <h1>Confronta Destinazioni</h1>
          <p>Metti a confronto le tue mete preferite</p>
        </div>
      </header>

      <div class="container">
        <!-- City Selectors -->
        <div class="selectors">
          <div class="selector">
            <label>Prima città</label>
            <select 
              [ngModel]="city1Id()" 
              (ngModelChange)="city1Id.set($event); updateComparison()">
              <option value="">Seleziona una città</option>
              @for (city of allCities(); track city.id) {
                <option [value]="city.id">{{ city.name }}, {{ city.country }}</option>
              }
            </select>
          </div>

          <div class="vs-badge">VS</div>

          <div class="selector">
            <label>Seconda città</label>
            <select 
              [ngModel]="city2Id()" 
              (ngModelChange)="city2Id.set($event); updateComparison()">
              <option value="">Seleziona una città</option>
              @for (city of allCities(); track city.id) {
                <option [value]="city.id">{{ city.name }}, {{ city.country }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Comparison Table -->
        @if (city1() && city2()) {
          <div class="comparison animate-fade-in-up">
            <!-- Header Row -->
            <div class="comparison-header">
              <div class="city-header">
                <img [src]="city1()!.thumbnailImage" [alt]="city1()!.name">
                <div class="city-info">
                  <h2>{{ city1()!.name }}</h2>
                  <span>{{ city1()!.country }}</span>
                </div>
              </div>
              <div class="criteria-label">Confronto</div>
              <div class="city-header">
                <img [src]="city2()!.thumbnailImage" [alt]="city2()!.name">
                <div class="city-info">
                  <h2>{{ city2()!.name }}</h2>
                  <span>{{ city2()!.country }}</span>
                </div>
              </div>
            </div>

            <!-- Comparison Rows -->
            @for (row of comparisonData(); track row.label) {
              <div class="comparison-row" [class.highlight]="row.highlight">
                <div class="value value-left" [class.winner]="row.winner === 1">
                  @if (row.winner === 1) {
                    <span class="winner-badge">✓</span>
                  }
                  <div class="value-content">
                    <span class="value-main">{{ row.value1 }}</span>
                    @if (row.subValue1) {
                      <span class="value-sub">{{ row.subValue1 }}</span>
                    }
                  </div>
                </div>
                <div class="criteria">
                  <div class="criteria-icon" [innerHTML]="getIconSvgSafe(row.iconKey || 'rating')"></div>
                  <span>{{ row.label }}</span>
                </div>
                <div class="value value-right" [class.winner]="row.winner === 2">
                  @if (row.winner === 2) {
                    <span class="winner-badge">✓</span>
                  }
                  <div class="value-content">
                    <span class="value-main">{{ row.value2 }}</span>
                    @if (row.subValue2) {
                      <span class="value-sub">{{ row.subValue2 }}</span>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Verdict Section -->
            <div class="verdict-section">
              <h3>📊 Il Nostro Verdetto</h3>
              <div class="verdict-grid">
                <div class="verdict-card">
                  <h4>{{ city1()!.name }}</h4>
                  <p class="verdict-tagline">{{ city1()!.tagline }}</p>
                  <div class="verdict-tags">
                    @for (tag of city1()!.tags.slice(0, 3); track tag) {
                      <span class="verdict-tag">{{ getTagLabel(tag) }}</span>
                    }
                  </div>
                  <p class="verdict-best">Perfetta per: <strong>{{ getIdealTraveler(city1()!) }}</strong></p>
                </div>
                <div class="verdict-vs">VS</div>
                <div class="verdict-card">
                  <h4>{{ city2()!.name }}</h4>
                  <p class="verdict-tagline">{{ city2()!.tagline }}</p>
                  <div class="verdict-tags">
                    @for (tag of city2()!.tags.slice(0, 3); track tag) {
                      <span class="verdict-tag">{{ getTagLabel(tag) }}</span>
                    }
                  </div>
                  <p class="verdict-best">Perfetta per: <strong>{{ getIdealTraveler(city2()!) }}</strong></p>
                </div>
              </div>
              <div class="verdict-summary">
                <p>{{ getComparisonSummary() }}</p>
              </div>
            </div>

            <!-- CTA -->
            <div class="comparison-cta">
              <a [routerLink]="['/city', city1()!.id]" class="btn btn-primary">
                Esplora {{ city1()!.name }}
              </a>
              <a [routerLink]="['/city', city2()!.id]" class="btn btn-primary">
                Esplora {{ city2()!.name }}
              </a>
            </div>
          </div>
        } @else {
          <div class="empty-state">
            <span class="empty-icon">⚖️</span>
            <h3>Seleziona due città da confrontare</h3>
            <p>Scegli le destinazioni usando i menu sopra per vedere il confronto dettagliato.</p>
          </div>
        }

        <!-- Quick Suggestions -->
        <section class="suggestions">
          <h3>Confronti popolari</h3>
          <div class="suggestion-cards">
            @for (suggestion of popularComparisons; track suggestion.label) {
              <button 
                class="suggestion-card"
                (click)="setComparison(suggestion.city1, suggestion.city2)">
                <span class="cities">{{ suggestion.label }}</span>
                <span class="arrow">→</span>
              </button>
            }
          </div>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .compare-page {
      min-height: 100vh;
      padding-top: var(--header-height);
      padding-bottom: var(--space-16);
    }

    .page-header {
      padding: var(--space-12) 0;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
      color: white;
      text-align: center;

      h1 {
        color: white;
        font-size: var(--text-4xl);
        margin-bottom: var(--space-2);
      }

      p {
        opacity: 0.9;
      }
    }

    // Selectors
    .selectors {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: var(--space-6);
      padding: var(--space-8) 0;

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
      }
    }

    .selector {
      flex: 1;
      max-width: 300px;

      @media (max-width: 768px) {
        max-width: none;
      }

      label {
        display: block;
        font-size: var(--text-sm);
        font-weight: 500;
        color: var(--color-gray-500);
        margin-bottom: var(--space-2);
      }

      select {
        width: 100%;
        padding: var(--space-4);
        font-family: var(--font-body);
        font-size: var(--text-base);
        border: 2px solid var(--color-gray-200);
        border-radius: var(--border-radius-md);
        background: white;
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: var(--color-accent);
        }
      }
    }

    .vs-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--color-accent);
      color: white;
      border-radius: 50%;
      font-weight: 700;
      font-size: var(--text-sm);

      @media (max-width: 768px) {
        align-self: center;
      }
    }

    // Comparison Table
    .comparison {
      background: var(--color-white);
      border-radius: var(--border-radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow-lg);
    }

    .comparison-header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      background: var(--color-cream);
      padding: var(--space-4);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: var(--space-4);
      }
    }

    .city-header {
      display: flex;
      align-items: center;
      gap: var(--space-4);

      img {
        width: 80px;
        height: 60px;
        object-fit: cover;
        border-radius: var(--border-radius-md);
      }

      .city-info {
        h2 {
          font-size: var(--text-xl);
          margin: 0;
        }

        span {
          font-size: var(--text-sm);
          color: var(--color-gray-500);
        }
      }

      &:last-child {
        justify-content: flex-end;
        text-align: right;

        @media (max-width: 768px) {
          justify-content: flex-start;
          text-align: left;
        }
      }
    }

    .criteria-label {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--color-gray-400);
      text-transform: uppercase;
      letter-spacing: 0.1em;

      @media (max-width: 768px) {
        display: none;
      }
    }

    .comparison-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid var(--color-gray-100);

      &:last-of-type {
        border-bottom: none;
      }

      @media (max-width: 768px) {
        grid-template-columns: 1fr 1fr;
        gap: var(--space-2);

        .criteria {
          grid-column: 1 / -1;
          margin-bottom: var(--space-2);
        }
      }
    }

    .value {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-weight: 500;

      &.winner {
        color: var(--color-accent);
      }

      &.value-left {
        justify-content: flex-start;

        .value-content {
          text-align: left;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
      }

      &.value-right {
        justify-content: flex-end;
        flex-direction: row-reverse;

        @media (max-width: 768px) {
          justify-content: flex-start;
          flex-direction: row;
        }

        .value-content {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;

          @media (max-width: 768px) {
            text-align: left;
            align-items: flex-start;
          }
        }
      }
    }

    .value-main {
      font-size: var(--text-lg);
    }

    .value-sub {
      font-size: var(--text-xs);
      color: var(--color-gray-400);
      font-weight: normal;
      display: block;
      margin-top: 2px;
    }

    .comparison-row.highlight {
      background: var(--color-cream);
    }

    .winner-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: var(--color-accent);
      color: white;
      border-radius: 50%;
      font-size: var(--text-xs);
    }

    .criteria {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      text-align: center;
      color: var(--color-gray-500);
      font-size: var(--text-sm);
      min-width: 120px;
      
      span {
        font-weight: 500;
        line-height: 1.3;
      }
    }

    .criteria-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--border-radius-md);
      background: linear-gradient(135deg, rgba(233, 69, 96, 0.1) 0%, rgba(15, 52, 96, 0.08) 100%);
      color: var(--color-accent);
      flex-shrink: 0;
      
      svg {
        width: 18px;
        height: 18px;
        stroke: currentColor;
      }
    }

    // Verdict Section
    .verdict-section {
      padding: var(--space-8);
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
      color: white;

      h3 {
        text-align: center;
        color: white;
        margin-bottom: var(--space-6);
        font-size: var(--text-xl);
      }
    }

    .verdict-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: var(--space-4);
      align-items: start;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .verdict-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: var(--space-5);
      border-radius: var(--border-radius-lg);

      h4 {
        color: white;
        font-size: var(--text-lg);
        margin: 0 0 var(--space-2) 0;
      }
    }

    .verdict-tagline {
      font-size: var(--text-sm);
      opacity: 0.85;
      margin-bottom: var(--space-3);
      font-style: italic;
    }

    .verdict-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }

    .verdict-tag {
      padding: var(--space-1) var(--space-2);
      background: rgba(255, 255, 255, 0.2);
      border-radius: var(--border-radius-full);
      font-size: var(--text-xs);
    }

    .verdict-best {
      font-size: var(--text-sm);
      opacity: 0.9;
      margin: 0;

      strong {
        color: var(--color-highlight);
      }
    }

    .verdict-vs {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--color-accent);
      border-radius: 50%;
      font-weight: 700;
      font-size: var(--text-sm);
      align-self: center;

      @media (max-width: 768px) {
        margin: var(--space-2) auto;
      }
    }

    .verdict-summary {
      margin-top: var(--space-6);
      padding: var(--space-4);
      background: rgba(255, 255, 255, 0.1);
      border-radius: var(--border-radius-md);
      text-align: center;

      p {
        margin: 0;
        font-size: var(--text-base);
        line-height: 1.6;
      }
    }

    .comparison-cta {
      display: flex;
      gap: var(--space-4);
      justify-content: center;
      padding: var(--space-6);
      background: var(--color-cream);

      @media (max-width: 576px) {
        flex-direction: column;
      }
    }

    // Empty State
    .empty-state {
      text-align: center;
      padding: var(--space-16);
      background: var(--color-white);
      border-radius: var(--border-radius-xl);

      .empty-icon {
        font-size: 4rem;
        display: block;
        margin-bottom: var(--space-4);
      }

      h3 {
        margin-bottom: var(--space-2);
      }

      p {
        color: var(--color-gray-500);
      }
    }

    // Suggestions
    .suggestions {
      margin-top: var(--space-12);

      h3 {
        text-align: center;
        margin-bottom: var(--space-6);
      }
    }

    .suggestion-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: var(--space-4);
    }

    .suggestion-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4);
      background: var(--color-white);
      border: 1px solid var(--color-gray-200);
      border-radius: var(--border-radius-md);
      font-family: var(--font-body);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-accent);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .cities {
        font-weight: 500;
      }

      .arrow {
        color: var(--color-accent);
      }
    }
  `]
})
export class CompareComponent {
  private sanitizer = inject(DomSanitizer);
  private cityService = inject(CityService);
  
  allCities = signal<City[]>([]);
  city1Id = signal<string>('');
  city2Id = signal<string>('');

  city1 = computed(() => {
    const id = this.city1Id();
    if (!id) return null;
    return this.allCities().find(c => c.id === id) || null;
  });
  
  city2 = computed(() => {
    const id = this.city2Id();
    if (!id) return null;
    return this.allCities().find(c => c.id === id) || null;
  });

  comparisonData = computed(() => {
    const c1 = this.city1();
    const c2 = this.city2();
    if (!c1 || !c2) return [];

    const details1 = this.cityService.getCityDetails(c1.id);
    const details2 = this.cityService.getCityDetails(c2.id);
    const practical1 = details1?.practicalInfo;
    const practical2 = details2?.practicalInfo;

    return [
      {
        icon: '⭐',
        iconKey: 'rating',
        label: 'Valutazione Complessiva',
        value1: `${c1.rating}/5`,
        value2: `${c2.rating}/5`,
        subValue1: this.getRatingLabel(c1.rating),
        subValue2: this.getRatingLabel(c2.rating),
        winner: c1.rating > c2.rating ? 1 : c1.rating < c2.rating ? 2 : 0,
        highlight: true,
        category: 'main'
      },
      {
        icon: '💰',
        iconKey: 'budget',
        label: 'Budget Complessivo',
        value1: '€'.repeat(c1.priceLevel),
        value2: '€'.repeat(c2.priceLevel),
        subValue1: this.getDailyBudget(c1.priceLevel),
        subValue2: this.getDailyBudget(c2.priceLevel),
        winner: c1.priceLevel < c2.priceLevel ? 1 : c1.priceLevel > c2.priceLevel ? 2 : 0,
        highlight: true,
        category: 'cost'
      },
      {
        icon: '🍽️',
        iconKey: 'meal',
        label: 'Costo Pasti',
        value1: practical1?.averageCosts.meal || 'N/A',
        value2: practical2?.averageCosts.meal || 'N/A',
        subValue1: this.getCostComparison(practical1?.averageCosts.meal, practical2?.averageCosts.meal, 1),
        subValue2: this.getCostComparison(practical2?.averageCosts.meal, practical1?.averageCosts.meal, 2),
        winner: this.compareCosts(practical1?.averageCosts.meal, practical2?.averageCosts.meal),
        category: 'cost'
      },
      {
        icon: '🚗',
        iconKey: 'transport',
        label: 'Costo Trasporti',
        value1: practical1?.averageCosts.transport || 'N/A',
        value2: practical2?.averageCosts.transport || 'N/A',
        subValue1: this.getTransportCostLabel(practical1?.averageCosts.transport),
        subValue2: this.getTransportCostLabel(practical2?.averageCosts.transport),
        winner: this.compareCosts(practical1?.averageCosts.transport, practical2?.averageCosts.transport),
        category: 'cost'
      },
      {
        icon: '🏨',
        iconKey: 'accommodation',
        label: 'Costo Alloggio',
        value1: practical1?.averageCosts.accommodation || 'N/A',
        value2: practical2?.averageCosts.accommodation || 'N/A',
        subValue1: this.getAccommodationCostLabel(practical1?.averageCosts.accommodation),
        subValue2: this.getAccommodationCostLabel(practical2?.averageCosts.accommodation),
        winner: this.compareCosts(practical1?.averageCosts.accommodation, practical2?.averageCosts.accommodation),
        category: 'cost'
      },
      {
        icon: '🌃',
        iconKey: 'nightlife',
        label: 'Vita Notturna',
        value1: this.getNightlifeRating(c1),
        value2: this.getNightlifeRating(c2),
        subValue1: this.getNightlifeDescription(c1),
        subValue2: this.getNightlifeDescription(c2),
        winner: this.compareNightlife(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '🎨',
        iconKey: 'culture',
        label: 'Cultura & Arte',
        value1: this.getCultureRating(c1),
        value2: this.getCultureRating(c2),
        subValue1: this.getCultureDescription(c1),
        subValue2: this.getCultureDescription(c2),
        winner: this.compareCulture(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '🏞️',
        iconKey: 'landscape',
        label: 'Paesaggi & Natura',
        value1: this.getLandscapeRating(c1),
        value2: this.getLandscapeRating(c2),
        subValue1: this.getLandscapeDescription(c1),
        subValue2: this.getLandscapeDescription(c2),
        winner: this.compareLandscapes(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '🍜',
        iconKey: 'food',
        label: 'Cibo & Gastronomia',
        value1: this.getFoodRating(c1),
        value2: this.getFoodRating(c2),
        subValue1: this.getFoodDescription(c1, practical1),
        subValue2: this.getFoodDescription(c2, practical2),
        winner: this.compareFood(c1, c2),
        highlight: true,
        category: 'lifestyle'
      },
      {
        icon: '🚇',
        iconKey: 'publicTransport',
        label: 'Trasporti Pubblici',
        value1: this.getPublicTransportRating(c1, practical1),
        value2: this.getPublicTransportRating(c2, practical2),
        subValue1: this.getPublicTransportDescription(practical1),
        subValue2: this.getPublicTransportDescription(practical2),
        winner: this.comparePublicTransport(practical1, practical2),
        category: 'practical'
      },
      {
        icon: '🗣️',
        iconKey: 'language',
        label: 'Lingue Parlate',
        value1: c1.language.join(', '),
        value2: c2.language.join(', '),
        subValue1: this.getLanguageDifficulty(c1.language),
        subValue2: this.getLanguageDifficulty(c2.language),
        winner: this.compareLanguageEase(c1.language, c2.language),
        category: 'practical'
      },
      {
        icon: '✈️',
        iconKey: 'accessibility',
        label: 'Facilità di Arrivo',
        value1: this.getAccessibility(c1),
        value2: this.getAccessibility(c2),
        subValue1: this.getFlightInfo(c1),
        subValue2: this.getFlightInfo(c2),
        winner: this.compareAccessibility(c1, c2),
        highlight: true,
        category: 'practical'
      },
      {
        icon: '🛒',
        iconKey: 'shopping',
        label: 'Shopping',
        value1: this.getShoppingRating(c1),
        value2: this.getShoppingRating(c2),
        subValue1: this.getShoppingDescription(c1),
        subValue2: this.getShoppingDescription(c2),
        winner: this.compareShopping(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '🎉',
        iconKey: 'events',
        label: 'Eventi & Festival',
        value1: this.getEventsRating(c1),
        value2: this.getEventsRating(c2),
        subValue1: this.getEventsDescription(c1),
        subValue2: this.getEventsDescription(c2),
        winner: this.compareEvents(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '❤️',
        iconKey: 'hospitality',
        label: 'Accoglienza & Gentilezza',
        value1: this.getHospitalityRating(c1),
        value2: this.getHospitalityRating(c2),
        subValue1: this.getHospitalityDescription(c1),
        subValue2: this.getHospitalityDescription(c2),
        winner: this.compareHospitality(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '📅',
        iconKey: 'duration',
        label: 'Durata Consigliata',
        value1: `${c1.suggestedDays.min}-${c1.suggestedDays.max} giorni`,
        value2: `${c2.suggestedDays.min}-${c2.suggestedDays.max} giorni`,
        subValue1: this.getTripTypeLabel(c1.suggestedDays.max),
        subValue2: this.getTripTypeLabel(c2.suggestedDays.max),
        winner: 0,
        category: 'planning'
      },
      {
        icon: '☀️',
        iconKey: 'season',
        label: 'Periodo Migliore',
        value1: c1.bestPeriod.slice(0, 2).join(' - '),
        value2: c2.bestPeriod.slice(0, 2).join(' - '),
        subValue1: this.getSeasonType(c1.bestPeriod),
        subValue2: this.getSeasonType(c2.bestPeriod),
        winner: 0,
        category: 'planning'
      },
      {
        icon: '🌡️',
        iconKey: 'climate',
        label: 'Clima',
        value1: this.getClimateType(c1),
        value2: this.getClimateType(c2),
        subValue1: this.getClimateDescription(c1),
        subValue2: this.getClimateDescription(c2),
        winner: 0,
        category: 'planning'
      },
      {
        icon: '🕐',
        iconKey: 'timezone',
        label: 'Fuso Orario',
        value1: c1.timezone,
        value2: c2.timezone,
        subValue1: this.getJetLagInfo(c1.timezone),
        subValue2: this.getJetLagInfo(c2.timezone),
        winner: this.compareTimezone(c1.timezone, c2.timezone),
        category: 'practical'
      },
      {
        icon: '💱',
        iconKey: 'currency',
        label: 'Valuta',
        value1: c1.currency,
        value2: c2.currency,
        subValue1: this.getCurrencyTip(c1.currency),
        subValue2: this.getCurrencyTip(c2.currency),
        winner: this.compareCurrency(c1.currency, c2.currency),
        category: 'practical'
      },
      {
        icon: '🛡️',
        iconKey: 'safety',
        label: 'Sicurezza',
        value1: this.getSafetyLevel(c1),
        value2: this.getSafetyLevel(c2),
        subValue1: this.getSafetyTip(c1),
        subValue2: this.getSafetyTip(c2),
        winner: this.compareSafety(c1, c2),
        category: 'practical'
      },
      {
        icon: '🔥',
        iconKey: 'popularity',
        label: 'Popolarità',
        value1: `${c1.popularityScore}/100`,
        value2: `${c2.popularityScore}/100`,
        subValue1: this.getPopularityLabel(c1.popularityScore),
        subValue2: this.getPopularityLabel(c2.popularityScore),
        winner: c1.popularityScore > c2.popularityScore ? 1 : c1.popularityScore < c2.popularityScore ? 2 : 0,
        category: 'main'
      },
      {
        icon: '📞',
        iconKey: 'emergency',
        label: 'Numero Emergenze',
        value1: c1.emergencyNumber,
        value2: c2.emergencyNumber,
        winner: 0,
        category: 'practical'
      },
      // Nuovi criteri aggiuntivi
      {
        icon: '🌊',
        iconKey: 'beach',
        label: 'Spiagge & Mare',
        value1: this.getBeachRating(c1),
        value2: this.getBeachRating(c2),
        subValue1: this.getBeachDescription(c1),
        subValue2: this.getBeachDescription(c2),
        winner: this.compareBeaches(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '⛰️',
        iconKey: 'mountain',
        label: 'Montagne & Trekking',
        value1: this.getMountainRating(c1),
        value2: this.getMountainRating(c2),
        subValue1: this.getMountainDescription(c1),
        subValue2: this.getMountainDescription(c2),
        winner: this.compareMountains(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '☕',
        iconKey: 'coffee',
        label: 'Qualità del Caffè',
        value1: this.getCoffeeRating(c1),
        value2: this.getCoffeeRating(c2),
        subValue1: this.getCoffeeDescription(c1),
        subValue2: this.getCoffeeDescription(c2),
        winner: this.compareCoffee(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '🍷',
        iconKey: 'wine',
        label: 'Vino & Bevande',
        value1: this.getWineRating(c1),
        value2: this.getWineRating(c2),
        subValue1: this.getWineDescription(c1),
        subValue2: this.getWineDescription(c2),
        winner: this.compareWine(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '👨‍👩‍👧‍👦',
        iconKey: 'family',
        label: 'Famiglia-Friendly',
        value1: this.getFamilyRating(c1),
        value2: this.getFamilyRating(c2),
        subValue1: this.getFamilyDescription(c1),
        subValue2: this.getFamilyDescription(c2),
        winner: this.compareFamily(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '🏳️‍🌈',
        iconKey: 'lgbtq',
        label: 'LGBTQ+ Friendly',
        value1: this.getLGBTQRating(c1),
        value2: this.getLGBTQRating(c2),
        subValue1: this.getLGBTQDescription(c1),
        subValue2: this.getLGBTQDescription(c2),
        winner: this.compareLGBTQ(c1, c2),
        category: 'lifestyle'
      },
      {
        icon: '💧',
        iconKey: 'water',
        label: 'Qualità Acqua',
        value1: this.getWaterQuality(c1),
        value2: this.getWaterQuality(c2),
        subValue1: this.getWaterDescription(c1),
        subValue2: this.getWaterDescription(c2),
        winner: this.compareWaterQuality(c1, c2),
        category: 'practical'
      },
      {
        icon: '🌐',
        iconKey: 'wifi',
        label: 'WiFi & Connessione',
        value1: this.getWiFIRating(c1),
        value2: this.getWiFIRating(c2),
        subValue1: this.getWiFIDescription(c1),
        subValue2: this.getWiFIDescription(c2),
        winner: this.compareWiFi(c1, c2),
        category: 'practical'
      },
      {
        icon: '💨',
        iconKey: 'airQuality',
        label: 'Qualità Aria',
        value1: this.getAirQuality(c1),
        value2: this.getAirQuality(c2),
        subValue1: this.getAirQualityDescription(c1),
        subValue2: this.getAirQualityDescription(c2),
        winner: this.compareAirQuality(c1, c2),
        category: 'practical'
      },
      {
        icon: '💳',
        iconKey: 'tipping',
        label: 'Tasse & Mance',
        value1: this.getTippingInfo(c1),
        value2: this.getTippingInfo(c2),
        subValue1: this.getTippingDescription(c1),
        subValue2: this.getTippingDescription(c2),
        winner: 0,
        category: 'practical'
      },
      {
        icon: '🏠',
        iconKey: 'livingCost',
        label: 'Costo della Vita',
        value1: this.getLivingCost(c1),
        value2: this.getLivingCost(c2),
        subValue1: this.getLivingCostDescription(c1),
        subValue2: this.getLivingCostDescription(c2),
        winner: this.compareLivingCost(c1, c2),
        category: 'cost'
      },
      {
        icon: '⭐',
        iconKey: 'qualityOfLife',
        label: 'Qualità della Vita',
        value1: this.getQualityOfLife(c1),
        value2: this.getQualityOfLife(c2),
        subValue1: this.getQualityOfLifeDescription(c1),
        subValue2: this.getQualityOfLifeDescription(c2),
        winner: this.compareQualityOfLife(c1, c2),
        highlight: true,
        category: 'main'
      }
    ];
  });

  // Tag labels for display
  tagLabels: Record<string, string> = {
    cultural: 'Cultura', foodie: 'Gastronomia', adventure: 'Avventura',
    relaxation: 'Relax', nightlife: 'Vita notturna', nature: 'Natura',
    romantic: 'Romantico', budget: 'Low-cost', luxury: 'Lusso',
    beach: 'Mare', architecture: 'Architettura', spiritual: 'Spirituale',
    unique: 'Unico', photography: 'Fotografico', wine: 'Vino',
    wildlife: 'Wildlife', exotic: 'Esotico', technology: 'Tech',
    historic: 'Storico', family: 'Famiglia', shopping: 'Shopping',
    music: 'Musica', art: 'Arte', trekking: 'Trekking'
  };

  getTagLabel(tag: string): string {
    return this.tagLabels[tag] || tag;
  }

  getRatingLabel(rating: number): string {
    if (rating >= 4.8) return 'Eccellente';
    if (rating >= 4.5) return 'Ottimo';
    if (rating >= 4.0) return 'Molto buono';
    if (rating >= 3.5) return 'Buono';
    return 'Discreto';
  }

  getCostLabel(level: number): string {
    const labels = ['', 'Economico', 'Accessibile', 'Medio', 'Costoso', 'Lusso'];
    return labels[level] || '';
  }

  getDailyBudget(level: number): string {
    const budgets = ['', '30-50€/giorno', '50-80€/giorno', '80-120€/giorno', '120-180€/giorno', '180€+/giorno'];
    return budgets[level] || '';
  }

  getTripTypeLabel(days: number): string {
    if (days <= 3) return 'Weekend lungo';
    if (days <= 5) return 'Settimana corta';
    if (days <= 7) return 'Settimana piena';
    return 'Viaggio esteso';
  }

  getSeasonType(months: string[]): string {
    const springMonths = ['Marzo', 'Aprile', 'Maggio'];
    const summerMonths = ['Giugno', 'Luglio', 'Agosto'];
    const autumnMonths = ['Settembre', 'Ottobre', 'Novembre'];
    const winterMonths = ['Dicembre', 'Gennaio', 'Febbraio'];
    
    if (months.some(m => summerMonths.includes(m))) return 'Alta stagione estiva';
    if (months.some(m => springMonths.includes(m))) return 'Primavera ideale';
    if (months.some(m => autumnMonths.includes(m))) return 'Autunno consigliato';
    return 'Inverno/Bassa stagione';
  }

  getClimateDescription(city: City): string {
    const continent = city.continent.toLowerCase();
    if (city.tags.includes('beach')) return 'Caldo tutto l\'anno';
    if (continent === 'europa') return 'Estati miti, inverni freddi';
    if (continent === 'asia') return 'Attenzione ai monsoni';
    return 'Verificare stagione';
  }

  getJetLagInfo(timezone: string): string {
    const offset = timezone.replace('GMT', '');
    if (offset === '+1' || offset === '+2') return 'Nessun jet lag';
    if (offset.includes('+') && parseInt(offset) <= 4) return 'Jet lag leggero';
    if (offset.includes('+') && parseInt(offset) <= 8) return 'Jet lag moderato';
    return 'Jet lag significativo';
  }

  getCurrencyTip(currency: string): string {
    if (currency === 'EUR') return 'Nessun cambio';
    if (currency === 'USD' || currency === 'GBP') return 'Cambio facile';
    return 'Cambiare in loco';
  }

  getLanguageDifficulty(languages: string[]): string {
    const easyLanguages = ['Inglese', 'Spagnolo', 'Francese', 'Italiano', 'Portoghese'];
    if (languages.some(l => easyLanguages.includes(l))) return 'Facile comunicare';
    return 'App traduttore utile';
  }

  getAccessibility(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'europa') return 'Voli diretti frequenti';
    if (city.popularityScore >= 80) return 'Ottimi collegamenti';
    if (city.popularityScore >= 50) return 'Buoni collegamenti';
    return 'Possibili scali';
  }

  getFlightInfo(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'europa') return '1-3h dall\'Italia';
    if (continent === 'africa') return '3-6h dall\'Italia';
    if (continent === 'asia') return '8-12h dall\'Italia';
    if (continent === 'americhe') return '9-14h dall\'Italia';
    if (continent === 'oceania') return '20h+ dall\'Italia';
    return 'Verificare voli';
  }

  getSafetyLevel(city: City): string {
    const score = city.rating;
    if (score >= 4.5) return '✅ Molto sicura';
    if (score >= 4.0) return '✅ Sicura';
    if (score >= 3.5) return '⚠️ Attenzione';
    return '⚠️ Cautela';
  }

  getSafetyTip(city: City): string {
    const tags = city.tags;
    if (tags.includes('luxury')) return 'Zone turistiche sicure';
    if (city.continent.toLowerCase() === 'europa') return 'Standard europei';
    return 'Precauzioni normali';
  }

  getPopularityLabel(score: number): string {
    if (score >= 90) return 'Top mondiale';
    if (score >= 75) return 'Molto popolare';
    if (score >= 50) return 'Popolare';
    if (score >= 25) return 'In crescita';
    return 'Nascosta';
  }

  getClimateType(city: City): string {
    const continent = city.continent.toLowerCase();
    const tags = city.tags;
    
    if (tags.includes('beach') || tags.includes('tropical')) return 'Tropicale';
    if (city.name.includes('Reykjavik') || city.name.includes('Iceland')) return 'Subartico';
    if (continent === 'asia' && tags.includes('exotic')) return 'Monsoni';
    if (continent === 'europa') return 'Temperato';
    if (continent === 'africa') return 'Caldo/Arido';
    if (continent === 'oceania') return 'Oceanico';
    return 'Vario';
  }

  getIdealTraveler(city: City): string {
    const tags = city.tags;
    if (tags.includes('romantic')) return 'Coppie e romantici';
    if (tags.includes('adventure')) return 'Avventurieri';
    if (tags.includes('cultural')) return 'Amanti della cultura';
    if (tags.includes('foodie')) return 'Food lovers';
    if (tags.includes('beach')) return 'Amanti del mare';
    if (tags.includes('nightlife')) return 'Nottambuli';
    if (tags.includes('family')) return 'Famiglie';
    if (tags.includes('budget')) return 'Viaggiatori budget';
    return 'Tutti i viaggiatori';
  }

  getComparisonSummary(): string {
    const c1 = this.city1();
    const c2 = this.city2();
    if (!c1 || !c2) return '';

    const cheaper = c1.priceLevel < c2.priceLevel ? c1.name : c2.name;
    const moreExpensive = c1.priceLevel > c2.priceLevel ? c1.name : c2.name;
    const higherRated = c1.rating > c2.rating ? c1.name : c2.name;
    
    if (c1.priceLevel === c2.priceLevel && c1.rating === c2.rating) {
      return `${c1.name} e ${c2.name} sono entrambe ottime scelte! Scegli in base alle tue preferenze personali: ${c1.name} è perfetta per ${this.getIdealTraveler(c1).toLowerCase()}, mentre ${c2.name} è ideale per ${this.getIdealTraveler(c2).toLowerCase()}.`;
    }
    
    if (c1.priceLevel < c2.priceLevel && c1.rating >= c2.rating) {
      return `${c1.name} offre il miglior rapporto qualità-prezzo: costa meno ed ha una valutazione pari o superiore a ${c2.name}.`;
    }
    
    if (c2.priceLevel < c1.priceLevel && c2.rating >= c1.rating) {
      return `${c2.name} offre il miglior rapporto qualità-prezzo: costa meno ed ha una valutazione pari o superiore a ${c1.name}.`;
    }

    return `Se cerchi un'esperienza premium, scegli ${higherRated}. Se vuoi risparmiare senza rinunciare alla qualità, ${cheaper} è un'ottima alternativa.`;
  }

  popularComparisons = [
    { city1: 'tokyo', city2: 'newyork', label: 'Tokyo vs New York' },
    { city1: 'lisbon', city2: 'barcelona', label: 'Lisbona vs Barcellona' },
    { city1: 'bali', city2: 'marrakech', label: 'Bali vs Marrakech' },
    { city1: 'reykjavik', city2: 'capetown', label: 'Reykjavik vs Città del Capo' }
  ];

  constructor() {
    this.allCities.set(this.cityService.getAllCities());
  }

  // ===== ICON HELPER =====
  getIconSvgSafe(iconKey: string | undefined): SafeHtml {
    if (!iconKey) return '';
    const icons: Record<string, string> = {
      rating: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      budget: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      meal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/></svg>',
      transport: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"/><path d="m12 15 5-5"/><path d="M17 10l-5 5"/></svg>',
      accommodation: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      nightlife: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
      culture: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/><circle cx="12" cy="12" r="3"/></svg>',
      landscape: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      food: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/></svg>',
      publicTransport: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 17h16l-1-7H5z"/><path d="M8 10h8"/><path d="M8 21h8"/><circle cx="7" cy="21" r="1"/><circle cx="17" cy="21" r="1"/></svg>',
      language: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      accessibility: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      shopping: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
      events: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>',
      hospitality: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      duration: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      season: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
      climate: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/></svg>',
      timezone: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      currency: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      safety: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      popularity: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      emergency: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      beach: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s2-3 10-3 10 3 10 3-2 3-10 3-10-3-10-3z"/><path d="M2 12s2 3 10 3 10-3 10-3"/></svg>',
      mountain: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 21 12 3 21 21"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
      coffee: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
      wine: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 22h8"/><path d="M7 10h10a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5v-2a5 5 0 0 1 5-5z"/><path d="M12 22V8"/><path d="M12 8V2a3 3 0 0 0-3-3"/></svg>',
      family: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      lgbtq: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      water: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s2-3 10-3 10 3 10 3-2 3-10 3-10-3-10-3z"/><path d="M2 12s2 3 10 3 10-3 10-3"/></svg>',
      wifi: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
      airQuality: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/></svg>',
      tipping: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      livingCost: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      qualityOfLife: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    };
    const svg = icons[iconKey] || icons['rating'] || '';
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  // ===== COST COMPARISON HELPERS =====
  
  getCostComparison(cost1: string | undefined, cost2: string | undefined, cityNum: 1 | 2): string {
    if (!cost1 || !cost2) return '';
    const avg1 = this.extractAverageCost(cost1);
    const avg2 = this.extractAverageCost(cost2);
    if (avg1 === 0 || avg2 === 0) return '';
    if (cityNum === 1) {
      if (avg1 < avg2) return 'Più economico';
      if (avg1 > avg2) return 'Più costoso';
    } else {
      if (avg2 < avg1) return 'Più economico';
      if (avg2 > avg1) return 'Più costoso';
    }
    return 'Simile';
  }

  extractAverageCost(costStr: string): number {
    const match = costStr.match(/€(\d+)-(\d+)/);
    if (!match) return 0;
    return (parseInt(match[1]) + parseInt(match[2])) / 2;
  }

  compareCosts(cost1: string | undefined, cost2: string | undefined): number {
    if (!cost1 || !cost2) return 0;
    const avg1 = this.extractAverageCost(cost1);
    const avg2 = this.extractAverageCost(cost2);
    if (avg1 === 0 || avg2 === 0) return 0;
    if (avg1 < avg2) return 1;
    if (avg1 > avg2) return 2;
    return 0;
  }

  getTransportCostLabel(transport: string | undefined): string {
    if (!transport) return '';
    const avg = this.extractAverageCost(transport);
    if (avg <= 5) return 'Molto economico';
    if (avg <= 10) return 'Economico';
    if (avg <= 20) return 'Moderato';
    if (avg <= 30) return 'Costoso';
    return 'Molto costoso';
  }

  getAccommodationCostLabel(accommodation: string | undefined): string {
    if (!accommodation) return '';
    const avg = this.extractAverageCost(accommodation);
    if (avg <= 50) return 'Budget';
    if (avg <= 100) return 'Mid-range';
    if (avg <= 200) return 'Comfort';
    if (avg <= 300) return 'Lusso';
    return 'Premium';
  }

  // ===== NIGHTLIFE HELPERS =====

  getNightlifeRating(city: City): string {
    if (city.tags.includes('nightlife')) {
      const score = city.popularityScore;
      if (score >= 80) return 'Eccellente';
      if (score >= 60) return 'Molto buona';
      return 'Buona';
    }
    if (city.tags.includes('romantic') || city.tags.includes('relaxation')) {
      return 'Tranquilla';
    }
    return 'Moderata';
  }

  getNightlifeDescription(city: City): string {
    if (city.tags.includes('nightlife')) {
      return 'Vita notturna vivace';
    }
    if (city.tags.includes('romantic')) {
      return 'Atmosfera romantica';
    }
    return 'Equilibrata';
  }

  compareNightlife(city1: City, city2: City): number {
    const score1 = this.getNightlifeScore(city1);
    const score2 = this.getNightlifeScore(city2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getNightlifeScore(city: City): number {
    let score = 0;
    if (city.tags.includes('nightlife')) score += 50;
    if (city.popularityScore >= 80) score += 30;
    if (city.popularityScore >= 60) score += 20;
    return score;
  }

  // ===== CULTURE HELPERS =====

  getCultureRating(city: City): string {
    let score = 0;
    if (city.tags.includes('cultural')) score += 30;
    if (city.tags.includes('art')) score += 30;
    if (city.tags.includes('historic')) score += 25;
    if (city.tags.includes('architecture')) score += 15;
    
    if (score >= 60) return 'Eccellente';
    if (score >= 40) return 'Molto ricca';
    if (score >= 20) return 'Ricca';
    return 'Moderata';
  }

  getCultureDescription(city: City): string {
    const tags = [];
    if (city.tags.includes('cultural')) tags.push('Cultura');
    if (city.tags.includes('art')) tags.push('Arte');
    if (city.tags.includes('historic')) tags.push('Storia');
    if (city.tags.includes('architecture')) tags.push('Architettura');
    return tags.slice(0, 2).join(', ') || 'Generale';
  }

  compareCulture(city1: City, city2: City): number {
    const score1 = this.getCultureScore(city1);
    const score2 = this.getCultureScore(city2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getCultureScore(city: City): number {
    let score = 0;
    if (city.tags.includes('cultural')) score += 30;
    if (city.tags.includes('art')) score += 30;
    if (city.tags.includes('historic')) score += 25;
    if (city.tags.includes('architecture')) score += 15;
    if (city.tags.includes('spiritual')) score += 10;
    return score;
  }

  // ===== LANDSCAPE HELPERS =====

  getLandscapeRating(city: City): string {
    const score = this.getLandscapeScore(city);
    if (score >= 70) return 'Stupendi';
    if (score >= 50) return 'Bellissimi';
    if (score >= 30) return 'Belli';
    if (score >= 15) return 'Vari';
    return 'Urbani';
  }

  getLandscapeDescription(city: City): string {
    const features = [];
    if (city.tags.includes('nature')) features.push('Natura');
    if (city.tags.includes('beach')) features.push('Spiagge');
    if (city.tags.includes('exotic')) features.push('Esotico');
    if (city.continent.toLowerCase() === 'oceania' || city.name.toLowerCase().includes('reykjavik')) {
      features.push('Paesaggi unici');
    }
    return features.slice(0, 2).join(', ') || 'Urbano';
  }

  compareLandscapes(city1: City, city2: City): number {
    const score1 = this.getLandscapeScore(city1);
    const score2 = this.getLandscapeScore(city2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getLandscapeScore(city: City): number {
    let score = 0;
    if (city.tags.includes('nature')) score += 30;
    if (city.tags.includes('beach')) score += 25;
    if (city.tags.includes('exotic')) score += 20;
    if (city.tags.includes('wildlife')) score += 15;
    if (city.continent.toLowerCase() === 'oceania') score += 20;
    if (city.name.toLowerCase().includes('reykjavik')) score += 25;
    return score;
  }

  // ===== FOOD HELPERS =====

  getFoodRating(city: City): string {
    let score = 0;
    if (city.tags.includes('foodie')) score += 50;
    const continent = city.continent.toLowerCase();
    if (continent === 'asia') score += 30;
    if (continent === 'europa' && ['italy', 'france', 'spain'].includes(city.country.toLowerCase())) {
      score += 25;
    }
    
    if (score >= 70) return 'Eccellente';
    if (score >= 50) return 'Molto buona';
    if (score >= 30) return 'Buona';
    return 'Decente';
  }

  getFoodDescription(city: City, practical: any): string {
    const desc = [];
    if (city.tags.includes('foodie')) desc.push('Gastronomia');
    if (practical?.averageCosts?.meal) {
      const avg = this.extractAverageCost(practical.averageCosts.meal);
      if (avg <= 8) desc.push('Street food');
      if (avg > 8 && avg <= 20) desc.push('Variegato');
      if (avg > 20) desc.push('Raffinato');
    }
    return desc.slice(0, 2).join(', ') || 'Locale';
  }

  compareFood(city1: City, city2: City): number {
    const score1 = this.getFoodScore(city1);
    const score2 = this.getFoodScore(city2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getFoodScore(city: City): number {
    let score = 0;
    if (city.tags.includes('foodie')) score += 50;
    const continent = city.continent.toLowerCase();
    if (continent === 'asia') score += 30;
    if (continent === 'europa' && ['italy', 'france', 'spain'].includes(city.country.toLowerCase())) {
      score += 25;
    }
    return score;
  }

  // ===== PUBLIC TRANSPORT HELPERS =====

  getPublicTransportRating(city: City, practical: any): string {
    if (!practical?.gettingAround) return 'Sconosciuto';
    
    const transport = practical.gettingAround.join(' ').toLowerCase();
    let score = 0;
    
    if (transport.includes('metro') || transport.includes('subway') || transport.includes('mrt') || transport.includes('bts')) {
      score += 30;
    }
    if (transport.includes('efficient') || transport.includes('capillare') || transport.includes('eccellente')) {
      score += 25;
    }
    if (transport.includes('24/7') || transport.includes('24 ore')) {
      score += 15;
    }
    if (transport.includes('piedi') || transport.includes('camminabile')) {
      score += 10;
    }
    if (transport.includes('auto') && transport.includes('obbligator')) {
      score -= 20;
    }
    
    if (score >= 60) return 'Eccellente';
    if (score >= 40) return 'Molto buono';
    if (score >= 20) return 'Buono';
    if (score >= 0) return 'Discreto';
    return 'Limitato';
  }

  getPublicTransportDescription(practical: any): string {
    if (!practical?.gettingAround) return '';
    const transport = practical.gettingAround[0] || '';
    return transport.length > 40 ? transport.substring(0, 37) + '...' : transport;
  }

  comparePublicTransport(practical1: any, practical2: any): number {
    const score1 = this.getPublicTransportScore(practical1);
    const score2 = this.getPublicTransportScore(practical2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getPublicTransportScore(practical: any): number {
    if (!practical?.gettingAround) return 0;
    
    const transport = practical.gettingAround.join(' ').toLowerCase();
    let score = 0;
    
    if (transport.includes('metro') || transport.includes('subway') || transport.includes('mrt') || transport.includes('bts')) {
      score += 30;
    }
    if (transport.includes('efficient') || transport.includes('capillare') || transport.includes('eccellente')) {
      score += 25;
    }
    if (transport.includes('24/7') || transport.includes('24 ore')) {
      score += 15;
    }
    if (transport.includes('piedi') || transport.includes('camminabile')) {
      score += 10;
    }
    if (transport.includes('auto') && transport.includes('obbligator')) {
      score -= 20;
    }
    
    return score;
  }

  // ===== LANGUAGE HELPERS =====

  compareLanguageEase(languages1: string[], languages2: string[]): number {
    const score1 = this.getLanguageEaseScore(languages1);
    const score2 = this.getLanguageEaseScore(languages2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getLanguageEaseScore(languages: string[]): number {
    const easyLanguages = ['Inglese', 'Spagnolo', 'Francese', 'Italiano', 'Portoghese'];
    const hasEasy = languages.some(l => easyLanguages.includes(l));
    return hasEasy ? 50 : 20;
  }

  // ===== ACCESSIBILITY HELPERS =====

  compareAccessibility(city1: City, city2: City): number {
    const score1 = this.getAccessibilityScore(city1);
    const score2 = this.getAccessibilityScore(city2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getAccessibilityScore(city: City): number {
    const continent = city.continent.toLowerCase();
    let score = 0;
    
    if (continent === 'europa') {
      score = 90;
    } else if (city.popularityScore >= 80) {
      score = 75;
    } else if (city.popularityScore >= 60) {
      score = 60;
    } else if (city.popularityScore >= 40) {
      score = 45;
    } else {
      score = 30;
    }
    
    return score;
  }

  // ===== SHOPPING HELPERS =====

  getShoppingRating(city: City): string {
    if (city.tags.includes('shopping')) return 'Eccellente';
    if (city.tags.includes('luxury')) return 'Alta gamma';
    if (city.popularityScore >= 80) return 'Buono';
    return 'Moderato';
  }

  getShoppingDescription(city: City): string {
    if (city.tags.includes('luxury')) return 'Boutique di lusso';
    if (city.tags.includes('shopping')) return 'Centri commerciali';
    return 'Varietà locale';
  }

  compareShopping(city1: City, city2: City): number {
    const score1 = this.getShoppingScore(city1);
    const score2 = this.getShoppingScore(city2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getShoppingScore(city: City): number {
    let score = 0;
    if (city.tags.includes('shopping')) score += 40;
    if (city.tags.includes('luxury')) score += 35;
    if (city.popularityScore >= 80) score += 25;
    return score;
  }

  // ===== EVENTS HELPERS =====

  getEventsRating(city: City): string {
    const score = this.getEventsScore(city);
    if (score >= 50) return 'Ricco';
    if (score >= 30) return 'Vari';
    return 'Occasionali';
  }

  getEventsDescription(city: City): string {
    if (city.tags.includes('music')) return 'Musica & Festival';
    if (city.tags.includes('cultural')) return 'Eventi culturali';
    return 'Tradizioni locali';
  }

  compareEvents(city1: City, city2: City): number {
    const score1 = this.getEventsScore(city1);
    const score2 = this.getEventsScore(city2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getEventsScore(city: City): number {
    let score = 0;
    if (city.tags.includes('music')) score += 30;
    if (city.tags.includes('cultural')) score += 25;
    if (city.popularityScore >= 80) score += 20;
    return score;
  }

  // ===== HOSPITALITY HELPERS =====

  getHospitalityRating(city: City): string {
    const score = this.getHospitalityScore(city);
    if (score >= 60) return 'Eccellente';
    if (score >= 40) return 'Molto buona';
    if (score >= 25) return 'Buona';
    return 'Neutrale';
  }

  getHospitalityDescription(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'asia') return 'Ospitalità orientale';
    if (continent === 'africa') return 'Accoglienza tradizionale';
    if (continent === 'americhe') return 'Calorosa';
    if (continent === 'oceania') return 'Informale';
    return 'Cortese';
  }

  compareHospitality(city1: City, city2: City): number {
    const score1 = this.getHospitalityScore(city1);
    const score2 = this.getHospitalityScore(city2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getHospitalityScore(city: City): number {
    let score = city.rating * 10; // Base score from rating
    const continent = city.continent.toLowerCase();
    
    if (continent === 'asia') score += 15;
    if (continent === 'africa') score += 10;
    if (continent === 'oceania') score += 10;
    if (city.tags.includes('romantic')) score += 5;
    
    return score;
  }

  // ===== TIMEZONE & CURRENCY HELPERS =====

  compareTimezone(timezone1: string, timezone2: string): number {
    const offset1 = this.parseTimezoneOffset(timezone1);
    const offset2 = this.parseTimezoneOffset(timezone2);
    const italyOffset = 1; // GMT+1
    
    const diff1 = Math.abs(offset1 - italyOffset);
    const diff2 = Math.abs(offset2 - italyOffset);
    
    if (diff1 < diff2) return 1;
    if (diff1 > diff2) return 2;
    return 0;
  }

  private parseTimezoneOffset(timezone: string): number {
    const match = timezone.match(/GMT([+-]\d+)/);
    if (!match) return 0;
    return parseInt(match[1]);
  }

  compareCurrency(currency1: string, currency2: string): number {
    const score1 = this.getCurrencyEaseScore(currency1);
    const score2 = this.getCurrencyEaseScore(currency2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getCurrencyEaseScore(currency: string): number {
    if (currency === 'EUR') return 100; // No cambio needed
    if (currency === 'USD' || currency === 'GBP') return 80; // Easy to exchange
    return 50; // Standard
  }

  // ===== SAFETY HELPERS =====

  compareSafety(city1: City, city2: City): number {
    const score1 = this.getSafetyScore(city1);
    const score2 = this.getSafetyScore(city2);
    if (score1 > score2) return 1;
    if (score1 < score2) return 2;
    return 0;
  }

  private getSafetyScore(city: City): number {
    let score = city.rating * 20;
    const continent = city.continent.toLowerCase();
    
    if (continent === 'europa') score += 10;
    if (continent === 'oceania') score += 10;
    if (city.tags.includes('luxury')) score += 5;
    
    return score;
  }

  // ===== NEW COMPARISON HELPERS =====
  
  // Beach
  getBeachRating(city: City): string {
    const tags = city.tags;
    if (tags.includes('beach')) return '⭐⭐⭐⭐⭐';
    const continent = city.continent.toLowerCase();
    if (continent === 'oceania' || continent === 'americhe') return '⭐⭐⭐⭐';
    return '⭐⭐';
  }

  getBeachDescription(city: City): string {
    const tags = city.tags;
    if (tags.includes('beach')) return 'Spiagge paradisiache';
    const continent = city.continent.toLowerCase();
    if (continent === 'oceania') return 'Spiagge spettacolari';
    if (continent === 'americhe') return 'Spiagge accessibili';
    return 'Spiagge limitate';
  }

  compareBeaches(c1: City, c2: City): number {
    const score1 = c1.tags.includes('beach') ? 5 : c1.continent.toLowerCase() === 'oceania' || c1.continent.toLowerCase() === 'americhe' ? 4 : 2;
    const score2 = c2.tags.includes('beach') ? 5 : c2.continent.toLowerCase() === 'oceania' || c2.continent.toLowerCase() === 'americhe' ? 4 : 2;
    return score1 > score2 ? 1 : score1 < score2 ? 2 : 0;
  }

  // Mountain
  getMountainRating(city: City): string {
    const tags = city.tags;
    if (tags.includes('trekking') || tags.includes('adventure')) return '⭐⭐⭐⭐⭐';
    const continent = city.continent.toLowerCase();
    if (continent === 'americhe' || continent === 'asia') return '⭐⭐⭐⭐';
    return '⭐⭐';
  }

  getMountainDescription(city: City): string {
    const tags = city.tags;
    if (tags.includes('trekking')) return 'Trekking eccellente';
    if (tags.includes('adventure')) return 'Avventure montane';
    const continent = city.continent.toLowerCase();
    if (continent === 'americhe') return 'Montagne accessibili';
    return 'Montagne limitate';
  }

  compareMountains(c1: City, c2: City): number {
    const score1 = c1.tags.includes('trekking') || c1.tags.includes('adventure') ? 5 : c1.continent.toLowerCase() === 'americhe' || c1.continent.toLowerCase() === 'asia' ? 4 : 2;
    const score2 = c2.tags.includes('trekking') || c2.tags.includes('adventure') ? 5 : c2.continent.toLowerCase() === 'americhe' || c2.continent.toLowerCase() === 'asia' ? 4 : 2;
    return score1 > score2 ? 1 : score1 < score2 ? 2 : 0;
  }

  // Coffee
  getCoffeeRating(city: City): string {
    const country = city.country.toLowerCase();
    const coffeeCountries = ['italia', 'portogallo', 'spagna', 'turchia', 'grecia', 'colombia', 'brasile', 'etiopia', 'vietnam'];
    if (coffeeCountries.some(c => country.includes(c))) return '⭐⭐⭐⭐⭐';
    const continent = city.continent.toLowerCase();
    if (continent === 'europa') return '⭐⭐⭐⭐';
    return '⭐⭐⭐';
  }

  getCoffeeDescription(city: City): string {
    const country = city.country.toLowerCase();
    if (country.includes('italia')) return 'Caffè italiano autentico';
    const coffeeCountries = ['portogallo', 'spagna', 'turchia', 'grecia', 'colombia', 'brasile', 'etiopia', 'vietnam'];
    if (coffeeCountries.some(c => country.includes(c))) return 'Tradizione caffè forte';
    return 'Caffè disponibile';
  }

  compareCoffee(c1: City, c2: City): number {
    const getScore = (city: City) => {
      const country = city.country.toLowerCase();
      const coffeeCountries = ['italia', 'portogallo', 'spagna', 'turchia', 'grecia', 'colombia', 'brasile', 'etiopia', 'vietnam'];
      if (coffeeCountries.some(c => country.includes(c))) return 5;
      if (city.continent.toLowerCase() === 'europa') return 4;
      return 3;
    };
    const score1 = getScore(c1);
    const score2 = getScore(c2);
    return score1 > score2 ? 1 : score1 < score2 ? 2 : 0;
  }

  // Wine
  getWineRating(city: City): string {
    const tags = city.tags;
    if (tags.includes('wine')) return '⭐⭐⭐⭐⭐';
    const country = city.country.toLowerCase();
    const wineCountries = ['italia', 'francia', 'spagna', 'portogallo', 'argentina', 'cile', 'sudafrica', 'australia'];
    if (wineCountries.some(c => country.includes(c))) return '⭐⭐⭐⭐';
    return '⭐⭐';
  }

  getWineDescription(city: City): string {
    const tags = city.tags;
    if (tags.includes('wine')) return 'Regione vinicola';
    const country = city.country.toLowerCase();
    const wineCountries = ['italia', 'francia', 'spagna', 'portogallo', 'argentina', 'cile', 'sudafrica', 'australia'];
    if (wineCountries.some(c => country.includes(c))) return 'Vini eccellenti';
    return 'Vini disponibili';
  }

  compareWine(c1: City, c2: City): number {
    const getScore = (city: City) => {
      if (city.tags.includes('wine')) return 5;
      const country = city.country.toLowerCase();
      const wineCountries = ['italia', 'francia', 'spagna', 'portogallo', 'argentina', 'cile', 'sudafrica', 'australia'];
      if (wineCountries.some(c => country.includes(c))) return 4;
      return 2;
    };
    const score1 = getScore(c1);
    const score2 = getScore(c2);
    return score1 > score2 ? 1 : score1 < score2 ? 2 : 0;
  }

  // Family
  getFamilyRating(city: City): string {
    const tags = city.tags;
    if (tags.includes('family')) return '⭐⭐⭐⭐⭐';
    if (city.rating >= 4.3) return '⭐⭐⭐⭐';
    return '⭐⭐⭐';
  }

  getFamilyDescription(city: City): string {
    const tags = city.tags;
    if (tags.includes('family')) return 'Perfetta per famiglie';
    if (city.rating >= 4.3) return 'Adatta alle famiglie';
    return 'Discreta per famiglie';
  }

  compareFamily(c1: City, c2: City): number {
    const getScore = (city: City) => {
      if (city.tags.includes('family')) return 5;
      if (city.rating >= 4.3) return 4;
      return 3;
    };
    const score1 = getScore(c1);
    const score2 = getScore(c2);
    return score1 > score2 ? 1 : score1 < score2 ? 2 : 0;
  }

  // LGBTQ+
  getLGBTQRating(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'europa' && city.rating >= 4.0) return '⭐⭐⭐⭐⭐';
    if (city.popularityScore >= 80 && city.rating >= 4.0) return '⭐⭐⭐⭐';
    return '⭐⭐⭐';
  }

  getLGBTQDescription(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'europa' && city.rating >= 4.0) return 'Molto inclusiva';
    if (city.popularityScore >= 80) return 'Inclusiva';
    return 'Discreta';
  }

  compareLGBTQ(c1: City, c2: City): number {
    const getScore = (city: City) => {
      const continent = city.continent.toLowerCase();
      if (continent === 'europa' && city.rating >= 4.0) return 5;
      if (city.popularityScore >= 80 && city.rating >= 4.0) return 4;
      return 3;
    };
    const score1 = getScore(c1);
    const score2 = getScore(c2);
    return score1 > score2 ? 1 : score1 < score2 ? 2 : 0;
  }

  // Water Quality
  getWaterQuality(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'europa' || continent === 'oceania') return '✅ Potabile';
    if (city.rating >= 4.5) return '✅ Generalmente sicura';
    return '⚠️ Bollire/comprare';
  }

  getWaterDescription(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'europa' || continent === 'oceania') return 'Acqua del rubinetto sicura';
    if (city.rating >= 4.5) return 'Acqua generalmente sicura';
    return 'Acqua in bottiglia consigliata';
  }

  compareWaterQuality(c1: City, c2: City): number {
    const getScore = (city: City) => {
      const continent = city.continent.toLowerCase();
      if (continent === 'europa' || continent === 'oceania') return 5;
      if (city.rating >= 4.5) return 4;
      return 2;
    };
    const score1 = getScore(c1);
    const score2 = getScore(c2);
    return score1 > score2 ? 1 : score1 < score2 ? 2 : 0;
  }

  // WiFi
  getWiFIRating(city: City): string {
    if (city.popularityScore >= 80) return '⭐⭐⭐⭐⭐';
    if (city.popularityScore >= 60) return '⭐⭐⭐⭐';
    return '⭐⭐⭐';
  }

  getWiFIDescription(city: City): string {
    if (city.popularityScore >= 80) return 'WiFi eccellente';
    if (city.popularityScore >= 60) return 'WiFi buono';
    return 'WiFi discreto';
  }

  compareWiFi(c1: City, c2: City): number {
    return c1.popularityScore > c2.popularityScore ? 1 : c1.popularityScore < c2.popularityScore ? 2 : 0;
  }

  // Air Quality
  getAirQuality(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'oceania') return '⭐⭐⭐⭐⭐';
    if (continent === 'europa' && city.popularityScore < 70) return '⭐⭐⭐⭐';
    if (city.popularityScore >= 90) return '⭐⭐⭐';
    return '⭐⭐';
  }

  getAirQualityDescription(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'oceania') return 'Aria pulitissima';
    if (continent === 'europa' && city.popularityScore < 70) return 'Aria buona';
    if (city.popularityScore >= 90) return 'Aria discreta';
    return 'Aria moderata';
  }

  compareAirQuality(c1: City, c2: City): number {
    const getScore = (city: City) => {
      const continent = city.continent.toLowerCase();
      if (continent === 'oceania') return 5;
      if (continent === 'europa' && city.popularityScore < 70) return 4;
      if (city.popularityScore >= 90) return 3;
      return 2;
    };
    const score1 = getScore(c1);
    const score2 = getScore(c2);
    return score1 > score2 ? 1 : score1 < score2 ? 2 : 0;
  }

  // Tipping
  getTippingInfo(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'europa') return 'Non obbligatorio';
    if (continent === 'americhe') return '10-20% standard';
    if (continent === 'asia') return 'Opzionale';
    return 'Verificare usanze';
  }

  getTippingDescription(city: City): string {
    const continent = city.continent.toLowerCase();
    if (continent === 'europa') return 'Mance non obbligatorie';
    if (continent === 'americhe') return 'Mance attese';
    return 'Mance opzionali';
  }

  // Living Cost
  getLivingCost(city: City): string {
    const level = city.priceLevel;
    if (level <= 2) return 'Molto economico';
    if (level === 3) return 'Moderato';
    return 'Costoso';
  }

  getLivingCostDescription(city: City): string {
    const level = city.priceLevel;
    if (level <= 2) return 'Costo vita basso';
    if (level === 3) return 'Costo vita medio';
    return 'Costo vita alto';
  }

  compareLivingCost(c1: City, c2: City): number {
    return c1.priceLevel < c2.priceLevel ? 1 : c1.priceLevel > c2.priceLevel ? 2 : 0;
  }

  // Quality of Life
  getQualityOfLife(city: City): string {
    const score = (city.rating * 20) + (city.popularityScore * 0.3);
    if (score >= 90) return '⭐⭐⭐⭐⭐';
    if (score >= 80) return '⭐⭐⭐⭐';
    if (score >= 70) return '⭐⭐⭐';
    return '⭐⭐';
  }

  getQualityOfLifeDescription(city: City): string {
    const score = (city.rating * 20) + (city.popularityScore * 0.3);
    if (score >= 90) return 'Qualità vita eccellente';
    if (score >= 80) return 'Qualità vita alta';
    if (score >= 70) return 'Qualità vita buona';
    return 'Qualità vita discreta';
  }

  compareQualityOfLife(c1: City, c2: City): number {
    const getScore = (city: City) => (city.rating * 20) + (city.popularityScore * 0.3);
    const score1 = getScore(c1);
    const score2 = getScore(c2);
    return score1 > score2 ? 1 : score1 < score2 ? 2 : 0;
  }

  updateComparison(): void {
    // Comparison updates automatically via computed signals
  }

  setComparison(city1: string, city2: string): void {
    this.city1Id.set(city1);
    this.city2Id.set(city2);
  }
}
