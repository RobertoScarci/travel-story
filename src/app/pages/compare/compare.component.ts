import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CityService } from '../../core/services/city.service';
import { City } from '../../core/models/city.model';

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
            <select [(ngModel)]="city1Id" (change)="updateComparison()">
              <option value="">Seleziona una città</option>
              @for (city of allCities(); track city.id) {
                <option [value]="city.id">{{ city.name }}, {{ city.country }}</option>
              }
            </select>
          </div>

          <div class="vs-badge">VS</div>

          <div class="selector">
            <label>Seconda città</label>
            <select [(ngModel)]="city2Id" (change)="updateComparison()">
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
                <div class="value" [class.winner]="row.winner === 1">
                  <span class="value-main">{{ row.value1 }}</span>
                  @if (row.subValue1) {
                    <span class="value-sub">{{ row.subValue1 }}</span>
                  }
                  @if (row.winner === 1) {
                    <span class="winner-badge">✓</span>
                  }
                </div>
                <div class="criteria">
                  <span class="criteria-icon">{{ row.icon }}</span>
                  <span>{{ row.label }}</span>
                </div>
                <div class="value" [class.winner]="row.winner === 2">
                  <span class="value-main">{{ row.value2 }}</span>
                  @if (row.subValue2) {
                    <span class="value-sub">{{ row.subValue2 }}</span>
                  }
                  @if (row.winner === 2) {
                    <span class="winner-badge">✓</span>
                  }
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

      &:last-child {
        justify-content: flex-end;

        @media (max-width: 768px) {
          justify-content: flex-start;
        }
      }

      &.winner {
        color: var(--color-accent);
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
      gap: var(--space-1);
      text-align: center;
      color: var(--color-gray-500);
      font-size: var(--text-sm);
    }

    .criteria-icon {
      font-size: 1.5rem;
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
  allCities = signal<City[]>([]);
  city1Id = '';
  city2Id = '';

  city1 = computed(() => 
    this.allCities().find(c => c.id === this.city1Id) || null
  );
  city2 = computed(() => 
    this.allCities().find(c => c.id === this.city2Id) || null
  );

  comparisonData = computed(() => {
    const c1 = this.city1();
    const c2 = this.city2();
    if (!c1 || !c2) return [];

    return [
      {
        icon: '⭐',
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
        label: 'Budget Giornaliero',
        value1: '€'.repeat(c1.priceLevel),
        value2: '€'.repeat(c2.priceLevel),
        subValue1: this.getDailyBudget(c1.priceLevel),
        subValue2: this.getDailyBudget(c2.priceLevel),
        winner: c1.priceLevel < c2.priceLevel ? 1 : c1.priceLevel > c2.priceLevel ? 2 : 0,
        highlight: true,
        category: 'main'
      },
      {
        icon: '🔥',
        label: 'Popolarità',
        value1: `${c1.popularityScore}/100`,
        value2: `${c2.popularityScore}/100`,
        subValue1: this.getPopularityLabel(c1.popularityScore),
        subValue2: this.getPopularityLabel(c2.popularityScore),
        winner: c1.popularityScore > c2.popularityScore ? 1 : c1.popularityScore < c2.popularityScore ? 2 : 0,
        highlight: true,
        category: 'main'
      },
      {
        icon: '📅',
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
        label: 'Fuso Orario',
        value1: c1.timezone,
        value2: c2.timezone,
        subValue1: this.getJetLagInfo(c1.timezone),
        subValue2: this.getJetLagInfo(c2.timezone),
        winner: 0,
        category: 'practical'
      },
      {
        icon: '💱',
        label: 'Valuta',
        value1: c1.currency,
        value2: c2.currency,
        subValue1: this.getCurrencyTip(c1.currency),
        subValue2: this.getCurrencyTip(c2.currency),
        winner: 0,
        category: 'practical'
      },
      {
        icon: '🗣️',
        label: 'Lingua',
        value1: c1.language.join(', '),
        value2: c2.language.join(', '),
        subValue1: this.getLanguageDifficulty(c1.language),
        subValue2: this.getLanguageDifficulty(c2.language),
        winner: 0,
        category: 'practical'
      },
      {
        icon: '✈️',
        label: 'Accessibilità',
        value1: this.getAccessibility(c1),
        value2: this.getAccessibility(c2),
        subValue1: this.getFlightInfo(c1),
        subValue2: this.getFlightInfo(c2),
        winner: 0,
        category: 'practical'
      },
      {
        icon: '🛡️',
        label: 'Sicurezza',
        value1: this.getSafetyLevel(c1),
        value2: this.getSafetyLevel(c2),
        subValue1: this.getSafetyTip(c1),
        subValue2: this.getSafetyTip(c2),
        winner: 0,
        category: 'practical'
      },
      {
        icon: '📞',
        label: 'Emergenze',
        value1: c1.emergencyNumber,
        value2: c2.emergencyNumber,
        winner: 0,
        category: 'practical'
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

  constructor(private cityService: CityService) {
    this.allCities.set(this.cityService.getAllCities());
  }

  updateComparison(): void {
    // Comparison updates automatically via computed signals
  }

  setComparison(city1: string, city2: string): void {
    this.city1Id = city1;
    this.city2Id = city2;
  }
}

