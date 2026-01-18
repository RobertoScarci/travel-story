import { Injectable, signal, effect } from '@angular/core';
import { StorageService } from './storage.service';

export interface DestinationFilters {
  selectedContinents: string[];
  selectedStyles: string[];
  maxBudget: number;
  sortBy: 'popular' | 'rating' | 'budget-low' | 'budget-high' | 'name';
  viewMode: 'grid' | 'list';
}

/**
 * FilterPreferencesService - Manages saved filter preferences
 * 
 * Features:
 * - Auto-save filters when they change
 * - Load saved filters on page visit
 * - Reset to defaults
 * - Persist for both guest and registered users
 */
@Injectable({
  providedIn: 'root'
})
export class FilterPreferencesService {
  private readonly FILTERS_KEY = 'destination_filters';
  
  // Default filter values
  private readonly DEFAULT_FILTERS: DestinationFilters = {
    selectedContinents: [],
    selectedStyles: [],
    maxBudget: 5,
    sortBy: 'popular',
    viewMode: 'grid'
  };

  // Reactive filter state
  filters = signal<DestinationFilters>(this.DEFAULT_FILTERS);

  constructor(private storage: StorageService) {
    // Load saved filters on initialization
    this.loadFilters();

    // Auto-save filters when they change
    effect(() => {
      const currentFilters = this.filters();
      // Skip auto-save on initial load (when filters are loaded from storage)
      if (this.hasLoaded) {
        this.saveFilters(currentFilters);
      }
      this.hasLoaded = true;
    });
  }

  private hasLoaded = false;

  /**
   * Load saved filters from storage
   */
  loadFilters(): void {
    try {
      const saved = this.storage.getLocal<DestinationFilters | null>(this.FILTERS_KEY, null);
      if (saved) {
        // Validate and merge with defaults
        this.filters.set({
          selectedContinents: Array.isArray(saved.selectedContinents) ? saved.selectedContinents : this.DEFAULT_FILTERS.selectedContinents,
          selectedStyles: Array.isArray(saved.selectedStyles) ? saved.selectedStyles : this.DEFAULT_FILTERS.selectedStyles,
          maxBudget: typeof saved.maxBudget === 'number' && saved.maxBudget >= 1 && saved.maxBudget <= 5 
            ? saved.maxBudget 
            : this.DEFAULT_FILTERS.maxBudget,
          sortBy: ['popular', 'rating', 'budget-low', 'budget-high', 'name'].includes(saved.sortBy)
            ? saved.sortBy as DestinationFilters['sortBy']
            : this.DEFAULT_FILTERS.sortBy,
          viewMode: saved.viewMode === 'grid' || saved.viewMode === 'list'
            ? saved.viewMode
            : this.DEFAULT_FILTERS.viewMode
        });
      }
    } catch (error) {
      console.error('Error loading filter preferences:', error);
      this.filters.set(this.DEFAULT_FILTERS);
    }
  }

  /**
   * Save filters to storage
   */
  private saveFilters(filters: DestinationFilters): void {
    try {
      this.storage.setLocal(this.FILTERS_KEY, filters);
    } catch (error) {
      console.error('Error saving filter preferences:', error);
    }
  }

  /**
   * Update filters (partial update)
   */
  updateFilters(partialFilters: Partial<DestinationFilters>): void {
    this.filters.update(current => ({
      ...current,
      ...partialFilters
    }));
  }

  /**
   * Reset filters to defaults
   */
  resetFilters(): void {
    this.filters.set(this.DEFAULT_FILTERS);
    this.storage.removeLocal(this.FILTERS_KEY);
  }

  /**
   * Check if filters differ from defaults
   */
  hasActiveFilters(): boolean {
    const current = this.filters();
    return (
      current.selectedContinents.length > 0 ||
      current.selectedStyles.length > 0 ||
      current.maxBudget < 5 ||
      current.sortBy !== 'popular' ||
      current.viewMode !== 'grid'
    );
  }
}
