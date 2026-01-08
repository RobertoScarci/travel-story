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
      <div class="container">
        <!-- Header -->
        <header class="page-header">
          <h1>Destinazioni</h1>
          <p class="results-count">{{ filteredCities().length }} destinazioni disponibili</p>
        </header>

        <!-- Filters Bar -->
        <div class="filters-bar">
          <!-- Continents -->
          <div class="filter-group">
            <span class="filter-label">Continente</span>
            <div class="filter-chips">
              @for (continent of continents; track continent) {
                <button 
                  class="filter-chip"
                  [class.active]="selectedContinents().includes(continent)"
                  (click)="toggleContinent(continent)">
                  {{ continent }}
                </button>
              }
            </div>
          </div>

          <!-- Travel Styles -->
          <div class="filter-group">
            <span class="filter-label">Stile</span>
            <div class="filter-chips">
              @for (style of styles; track style.id) {
                <button 
                  class="filter-chip"
                  [class.active]="selectedStyles().includes(style.id)"
                  (click)="toggleStyle(style.id)">
                  @switch (style.id) {
                    @case ('adventure') {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3l4 8 5-5 5 5V3H8z"/><path d="M2 21l6-6 4 4 4-4 6 6H2z"/></svg>
                    }
                    @case ('relaxation') {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12c0-1.657 4.03-3 9-3s9 1.343 9 3"/><path d="M3 12v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6"/><path d="M3 6c0-1.657 4.03-3 9-3s9 1.343 9 3"/></svg>
                    }
                    @case ('cultural') {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v0M9 12v0M9 15v0M9 18v0"/></svg>
                    }
                    @case ('foodie') {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4M9 5V3a1 1 0 0 1 1h4a1 1 0 0 1 1v2"/></svg>
                    }
                    @case ('nightlife') {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    }
                    @case ('nature') {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    }
                    @case ('romantic') {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    }
                    @case ('budget') {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    }
                  }
                  {{ style.label }}
                </button>
              }
            </div>
          </div>

          <!-- Budget -->
          <div class="filter-group budget-group">
            <span class="filter-label">Budget</span>
            <div class="budget-chips">
              @for (level of [1,2,3,4,5]; track level) {
                <button 
                  class="budget-chip"
                  [class.active]="maxBudget >= level"
                  (click)="maxBudget = level; applyFilters()">
                  {{ '€'.repeat(level) }}
                </button>
              }
            </div>
          </div>

          <!-- Reset & Sort -->
          <div class="filter-actions">
            @if (selectedContinents().length > 0 || selectedStyles().length > 0 || maxBudget < 5) {
              <button class="btn-reset" (click)="resetFilters()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Resetta
              </button>
            }
            <select [(ngModel)]="sortBy" (change)="applyFilters()" class="sort-select">
              <option value="popular">Più popolari</option>
              <option value="rating">Meglio valutate</option>
              <option value="budget-low">Prezzo: basso → alto</option>
              <option value="budget-high">Prezzo: alto → basso</option>
              <option value="name">A-Z</option>
            </select>
            <div class="view-toggle">
              <button 
                [class.active]="viewMode() === 'grid'"
                (click)="viewMode.set('grid')"
                aria-label="Vista griglia">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="4" width="18" height="4"/>
                  <rect x="3" y="10" width="18" height="4"/>
                  <rect x="3" y="16" width="18" height="4"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Results -->
        <section class="results">

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
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-300)" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <h3>Nessuna destinazione trovata</h3>
              <p>Prova a modificare i filtri per vedere più risultati.</p>
              <button class="btn btn-primary" (click)="resetFilters()">
                Mostra tutte
              </button>
            </div>
          }
        </section>
      </div>
    </main>
  `,
  styles: [`
    .destinations-page {
      min-height: 100vh;
      padding-top: var(--header-height);
      background: var(--color-off-white);
    }

    .page-header {
      padding: var(--space-8) 0 var(--space-6);
      text-align: left;

      h1 {
        font-size: clamp(2rem, 4vw, 2.5rem);
        font-weight: 800;
        background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 var(--space-2) 0;
        letter-spacing: -0.02em;
      }

      .results-count {
        color: var(--color-gray-500);
        font-size: var(--text-base);
        margin: 0;
      }
    }

    // Filters Bar
    .filters-bar {
      background: var(--color-white);
      border-radius: var(--border-radius-lg);
      padding: var(--space-5);
      margin-bottom: var(--space-6);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);

      @media (max-width: 768px) {
        padding: var(--space-4);
      }
    }

    .filter-group {
      display: flex;
      align-items: flex-start;
      gap: var(--space-4);
      flex-wrap: wrap;

      @media (max-width: 768px) {
        flex-direction: column;
        gap: var(--space-2);
      }
    }

    .filter-label {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--color-gray-600);
      min-width: 100px;
      padding-top: var(--space-2);
      flex-shrink: 0;

      @media (max-width: 768px) {
        min-width: auto;
        padding-top: 0;
      }
    }

    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      flex: 1;
    }

    .filter-chip {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      background: var(--color-off-white);
      border: 1.5px solid var(--color-gray-200);
      border-radius: var(--border-radius-full);
      font-size: var(--text-sm);
      color: var(--color-gray-600);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;

      svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        stroke: currentColor;
      }

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
        transform: translateY(-1px);
      }

      &.active {
        background: var(--color-accent);
        border-color: var(--color-accent);
        color: white;
        box-shadow: 0 2px 8px rgba(233, 69, 96, 0.2);

        svg {
          stroke: white;
        }
      }
    }

    .budget-group {
      .budget-chips {
        display: flex;
        gap: var(--space-2);
      }

      .budget-chip {
        padding: var(--space-2) var(--space-3);
        font-weight: 600;
        letter-spacing: 1px;
        min-width: 50px;
        justify-content: center;

        &.active {
          background: var(--color-highlight);
          border-color: var(--color-highlight);
        }
      }
    }

    .filter-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding-top: var(--space-2);
      border-top: 1px solid var(--color-gray-100);
      flex-wrap: wrap;

      .btn-reset {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        background: none;
        border: 1px solid var(--color-gray-300);
        border-radius: var(--border-radius-md);
        font-size: var(--text-sm);
        color: var(--color-gray-600);
        cursor: pointer;
        transition: all var(--transition-fast);

        svg {
          stroke: currentColor;
        }

        &:hover {
          border-color: var(--color-gray-400);
          background: var(--color-gray-50);
        }
      }

      .sort-select {
        padding: var(--space-2) var(--space-4);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        border: 1px solid var(--color-gray-200);
        border-radius: var(--border-radius-md);
        background: white;
        cursor: pointer;
        margin-left: auto;

        &:focus {
          outline: none;
          border-color: var(--color-accent);
        }
      }

      .view-toggle {
        display: flex;
        gap: var(--space-1);
        background: var(--color-gray-100);
        padding: 2px;
        border-radius: var(--border-radius-md);

        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          color: var(--color-gray-500);
          border-radius: var(--border-radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);

          &:hover {
            color: var(--color-primary);
          }

          &.active {
            background: white;
            color: var(--color-accent);
            box-shadow: var(--shadow-sm);
          }
        }
      }
    }

    .results {
      padding-bottom: var(--space-12);
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

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    // No Results
    .no-results {
      text-align: center;
      padding: var(--space-16);
      background: var(--color-white);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-sm);

      svg {
        margin-bottom: var(--space-4);
        stroke: var(--color-gray-300);
      }

      h3 {
        margin-bottom: var(--space-2);
        color: var(--color-primary);
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

