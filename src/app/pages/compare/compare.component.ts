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
              <div class="comparison-row">
                <div class="value" [class.winner]="row.winner === 1">
                  <span class="value-main">{{ row.value1 }}</span>
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
                  @if (row.winner === 2) {
                    <span class="winner-badge">✓</span>
                  }
                </div>
              </div>
            }

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
        label: 'Valutazione',
        value1: c1.rating.toString(),
        value2: c2.rating.toString(),
        winner: c1.rating > c2.rating ? 1 : c1.rating < c2.rating ? 2 : 0
      },
      {
        icon: '💰',
        label: 'Costo',
        value1: '€'.repeat(c1.priceLevel),
        value2: '€'.repeat(c2.priceLevel),
        winner: c1.priceLevel < c2.priceLevel ? 1 : c1.priceLevel > c2.priceLevel ? 2 : 0
      },
      {
        icon: '📅',
        label: 'Giorni consigliati',
        value1: `${c1.suggestedDays.min}-${c1.suggestedDays.max}`,
        value2: `${c2.suggestedDays.min}-${c2.suggestedDays.max}`,
        winner: 0
      },
      {
        icon: '☀️',
        label: 'Periodo migliore',
        value1: c1.bestPeriod.slice(0, 2).join(', '),
        value2: c2.bestPeriod.slice(0, 2).join(', '),
        winner: 0
      },
      {
        icon: '🌍',
        label: 'Continente',
        value1: c1.continent,
        value2: c2.continent,
        winner: 0
      },
      {
        icon: '🗣️',
        label: 'Lingua',
        value1: c1.language[0],
        value2: c2.language[0],
        winner: 0
      },
      {
        icon: '🔥',
        label: 'Popolarità',
        value1: c1.popularityScore.toString(),
        value2: c2.popularityScore.toString(),
        winner: c1.popularityScore > c2.popularityScore ? 1 : c1.popularityScore < c2.popularityScore ? 2 : 0
      }
    ];
  });

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

