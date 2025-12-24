import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CityCardComponent } from '../../shared/components/city-card/city-card.component';
import { CityService } from '../../core/services/city.service';
import { City } from '../../core/models/city.model';

/**
 * DestinationsComponent - Browse all destinations
 * 
 * Features:
 * - Filter by continent, style, budget
 * - Sort options
 * - Grid/List view toggle
 */
@Component({
  selector: 'app-destinations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CityCardComponent],
  template: `
    <main class="destinations-page">
      <!-- Header -->
      <header class="page-header">
        <div class="container">
          <h1>Esplora le Destinazioni</h1>
          <p>{{ filteredCities().length }} destinazioni da scoprire</p>
        </div>
      </header>

      <div class="container">
        <div class="content-layout">
          <!-- Sidebar Filters -->
          <aside class="filters-sidebar">
            <div class="filter-section">
              <h3>Continente</h3>
              <div class="filter-options">
                @for (continent of continents; track continent) {
                  <label class="filter-checkbox">
                    <input 
                      type="checkbox"
                      [checked]="selectedContinents().includes(continent)"
                      (change)="toggleContinent(continent)">
                    <span>{{ continent }}</span>
                  </label>
                }
              </div>
            </div>

            <div class="filter-section">
              <h3>Stile di Viaggio</h3>
              <div class="filter-options">
                @for (style of styles; track style.id) {
                  <label class="filter-checkbox">
                    <input 
                      type="checkbox"
                      [checked]="selectedStyles().includes(style.id)"
                      (change)="toggleStyle(style.id)">
                    <span>{{ style.icon }} {{ style.label }}</span>
                  </label>
                }
              </div>
            </div>

            <div class="filter-section">
              <h3>Budget</h3>
              <div class="budget-slider">
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  [(ngModel)]="maxBudget"
                  (input)="applyFilters()">
                <div class="budget-labels">
                  <span>€</span>
                  <span>€€€€€</span>
                </div>
                <p class="budget-value">Fino a {{ '€'.repeat(maxBudget) }}</p>
              </div>
            </div>

            <button class="btn btn-ghost full-width" (click)="resetFilters()">
              Resetta filtri
            </button>
          </aside>

          <!-- Results -->
          <section class="results">
            <!-- Sort Bar -->
            <div class="sort-bar">
              <div class="view-toggle">
                <button 
                  [class.active]="viewMode() === 'grid'"
                  (click)="viewMode.set('grid')"
                  aria-label="Vista griglia">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                  </svg>
                </button>
                <button 
                  [class.active]="viewMode() === 'list'"
                  (click)="viewMode.set('list')"
                  aria-label="Vista lista">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="4" width="18" height="4"/>
                    <rect x="3" y="10" width="18" height="4"/>
                    <rect x="3" y="16" width="18" height="4"/>
                  </svg>
                </button>
              </div>

              <select [(ngModel)]="sortBy" (change)="applyFilters()" class="sort-select">
                <option value="popular">Più popolari</option>
                <option value="rating">Meglio valutate</option>
                <option value="budget-low">Prezzo: basso → alto</option>
                <option value="budget-high">Prezzo: alto → basso</option>
                <option value="name">A-Z</option>
              </select>
            </div>

            <!-- City Grid -->
            @if (filteredCities().length > 0) {
              <div 
                class="city-grid"
                [class.list-view]="viewMode() === 'list'">
                @for (city of filteredCities(); track city.id; let i = $index) {
                  <app-city-card 
                    [city]="city"
                    class="animate-fade-in-up"
                    [style.animation-delay.ms]="i * 50"/>
                }
              </div>
            } @else {
              <div class="no-results">
                <span class="no-results-icon">🔍</span>
                <h3>Nessuna destinazione trovata</h3>
                <p>Prova a modificare i filtri per vedere più risultati.</p>
                <button class="btn btn-primary" (click)="resetFilters()">
                  Mostra tutte
                </button>
              </div>
            }
          </section>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .destinations-page {
      min-height: 100vh;
      padding-top: var(--header-height);
    }

    .page-header {
      padding: var(--space-12) 0;
      background: linear-gradient(135deg, var(--color-cream) 0%, var(--color-off-white) 100%);
      text-align: center;

      h1 {
        font-size: var(--text-4xl);
        margin-bottom: var(--space-2);
      }

      p {
        color: var(--color-gray-500);
      }
    }

    .content-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: var(--space-8);
      padding: var(--space-8) 0;

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
      }
    }

    // Filters
    .filters-sidebar {
      @media (max-width: 992px) {
        display: none; // TODO: Mobile filter drawer
      }
    }

    .filter-section {
      margin-bottom: var(--space-6);
      padding-bottom: var(--space-6);
      border-bottom: 1px solid var(--color-gray-100);

      h3 {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-gray-500);
        margin-bottom: var(--space-3);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }

    .filter-options {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .filter-checkbox {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2);
      border-radius: var(--border-radius-sm);
      cursor: pointer;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-cream);
      }

      input {
        accent-color: var(--color-accent);
      }

      span {
        font-size: var(--text-sm);
        color: var(--color-gray-500);
      }
    }

    .budget-slider {
      input[type="range"] {
        width: 100%;
        accent-color: var(--color-accent);
      }

      .budget-labels {
        display: flex;
        justify-content: space-between;
        font-size: var(--text-xs);
        color: var(--color-gray-400);
        margin-top: var(--space-1);
      }

      .budget-value {
        text-align: center;
        font-size: var(--text-sm);
        color: var(--color-accent);
        margin-top: var(--space-2);
      }
    }

    .full-width {
      width: 100%;
    }

    // Sort Bar
    .sort-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6);
      padding: var(--space-3);
      background: var(--color-white);
      border-radius: var(--border-radius-md);
    }

    .view-toggle {
      display: flex;
      gap: var(--space-1);

      button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: none;
        border: none;
        color: var(--color-gray-400);
        border-radius: var(--border-radius-sm);
        cursor: pointer;
        transition: all var(--transition-fast);

        &:hover {
          background: var(--color-cream);
          color: var(--color-gray-500);
        }

        &.active {
          background: var(--color-primary);
          color: white;
        }
      }
    }

    .sort-select {
      padding: var(--space-2) var(--space-4);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      border: 1px solid var(--color-gray-200);
      border-radius: var(--border-radius-sm);
      background: white;
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: var(--color-accent);
      }
    }

    // City Grid
    .city-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-6);

      &.list-view {
        grid-template-columns: 1fr;

        app-city-card {
          // List view styles would go here
        }
      }
    }

    // No Results
    .no-results {
      text-align: center;
      padding: var(--space-16);

      .no-results-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: var(--space-4);
      }

      h3 {
        margin-bottom: var(--space-2);
      }

      p {
        color: var(--color-gray-500);
        margin-bottom: var(--space-6);
      }
    }
  `]
})
export class DestinationsComponent implements OnInit {
  // State
  allCities = signal<City[]>([]);
  filteredCities = signal<City[]>([]);
  selectedContinents = signal<string[]>([]);
  selectedStyles = signal<string[]>([]);
  maxBudget = 5;
  sortBy = 'popular';
  viewMode = signal<'grid' | 'list'>('grid');

  continents = ['Europa', 'Asia', 'Nord America', 'Africa'];
  
  styles = [
    { id: 'adventure', icon: '🏔️', label: 'Avventura' },
    { id: 'relaxation', icon: '🏖️', label: 'Relax' },
    { id: 'cultural', icon: '🏛️', label: 'Cultura' },
    { id: 'foodie', icon: '🍝', label: 'Gastronomia' },
    { id: 'nightlife', icon: '🌙', label: 'Vita notturna' },
    { id: 'nature', icon: '🌿', label: 'Natura' },
    { id: 'romantic', icon: '💕', label: 'Romantico' },
    { id: 'budget', icon: '💰', label: 'Budget' }
  ];

  constructor(private cityService: CityService) {}

  ngOnInit(): void {
    this.allCities.set(this.cityService.getAllCities());
    this.applyFilters();
  }

  toggleContinent(continent: string): void {
    this.selectedContinents.update(list => {
      if (list.includes(continent)) {
        return list.filter(c => c !== continent);
      }
      return [...list, continent];
    });
    this.applyFilters();
  }

  toggleStyle(style: string): void {
    this.selectedStyles.update(list => {
      if (list.includes(style)) {
        return list.filter(s => s !== style);
      }
      return [...list, style];
    });
    this.applyFilters();
  }

  applyFilters(): void {
    let cities = [...this.allCities()];

    // Filter by continent
    if (this.selectedContinents().length > 0) {
      cities = cities.filter(city => 
        this.selectedContinents().includes(city.continent)
      );
    }

    // Filter by style
    if (this.selectedStyles().length > 0) {
      cities = cities.filter(city =>
        city.tags.some(tag => this.selectedStyles().includes(tag))
      );
    }

    // Filter by budget
    cities = cities.filter(city => city.priceLevel <= this.maxBudget);

    // Sort
    switch (this.sortBy) {
      case 'popular':
        cities.sort((a, b) => b.popularityScore - a.popularityScore);
        break;
      case 'rating':
        cities.sort((a, b) => b.rating - a.rating);
        break;
      case 'budget-low':
        cities.sort((a, b) => a.priceLevel - b.priceLevel);
        break;
      case 'budget-high':
        cities.sort((a, b) => b.priceLevel - a.priceLevel);
        break;
      case 'name':
        cities.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    this.filteredCities.set(cities);
  }

  resetFilters(): void {
    this.selectedContinents.set([]);
    this.selectedStyles.set([]);
    this.maxBudget = 5;
    this.sortBy = 'popular';
    this.applyFilters();
  }
}

