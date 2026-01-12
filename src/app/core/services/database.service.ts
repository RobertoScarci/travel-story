import { Injectable } from '@angular/core';
import { City } from '../models/city.model';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * DatabaseService - IndexedDB wrapper for persistent city storage
 * 
 * Uses IndexedDB for client-side database storage.
 * Falls back to localStorage if IndexedDB is not available.
 */
@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private readonly DB_NAME = 'TravelStoryDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'cities';
  private db: IDBDatabase | null = null;
  private useIndexedDB = true;

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported, falling back to localStorage');
      this.useIndexedDB = false;
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB, falling back to localStorage');
        this.useIndexedDB = false;
        resolve(); // Continue with localStorage fallback
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('name', 'name', { unique: false });
          objectStore.createIndex('country', 'country', { unique: false });
          objectStore.createIndex('continent', 'continent', { unique: false });
        }
      };
    });
  }

  /**
   * Save a city to the database
   */
  async saveCity(city: City): Promise<void> {
    if (this.useIndexedDB && this.db) {
      return this.saveCityToIndexedDB(city);
    } else {
      return this.saveCityToLocalStorage(city);
    }
  }

  /**
   * Save multiple cities in batch
   */
  async saveCities(cities: City[]): Promise<void> {
    if (this.useIndexedDB && this.db) {
      return this.saveCitiesToIndexedDB(cities);
    } else {
      return this.saveCitiesToLocalStorage(cities);
    }
  }

  /**
   * Get a city by ID
   */
  async getCity(id: string): Promise<City | null> {
    if (this.useIndexedDB && this.db) {
      return this.getCityFromIndexedDB(id);
    } else {
      return this.getCityFromLocalStorage(id);
    }
  }

  /**
   * Get all cities
   */
  async getAllCities(): Promise<City[]> {
    if (this.useIndexedDB && this.db) {
      return this.getAllCitiesFromIndexedDB();
    } else {
      return this.getAllCitiesFromLocalStorage();
    }
  }

  /**
   * Check if database has any cities
   */
  async hasCities(): Promise<boolean> {
    const cities = await this.getAllCities();
    return cities.length > 0;
  }

  /**
   * Get count of cities in database
   */
  async getCityCount(): Promise<number> {
    const cities = await this.getAllCities();
    return cities.length;
  }

  /**
   * Delete a city
   */
  async deleteCity(id: string): Promise<void> {
    if (this.useIndexedDB && this.db) {
      return this.deleteCityFromIndexedDB(id);
    } else {
      return this.deleteCityFromLocalStorage(id);
    }
  }

  /**
   * Clear all cities
   */
  async clearAll(): Promise<void> {
    if (this.useIndexedDB && this.db) {
      return this.clearAllFromIndexedDB();
    } else {
      return this.clearAllFromLocalStorage();
    }
  }

  /**
   * Search cities by query
   */
  async searchCities(query: string): Promise<City[]> {
    const cities = await this.getAllCities();
    const lowercaseQuery = query.toLowerCase();
    
    return cities.filter(city =>
      city.name.toLowerCase().includes(lowercaseQuery) ||
      city.country.toLowerCase().includes(lowercaseQuery) ||
      city.continent.toLowerCase().includes(lowercaseQuery) ||
      city.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  // IndexedDB methods
  private saveCityToIndexedDB(city: City): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(city);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private saveCitiesToIndexedDB(cities: City[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      let completed = 0;
      let hasError = false;

      cities.forEach(city => {
        const request = store.put(city);
        request.onsuccess = () => {
          completed++;
          if (completed === cities.length && !hasError) {
            resolve();
          }
        };
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
      });
    });
  }

  private getCityFromIndexedDB(id: string): Promise<City | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private getAllCitiesFromIndexedDB(): Promise<City[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private deleteCityFromIndexedDB(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private clearAllFromIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // LocalStorage fallback methods
  private async saveCityToLocalStorage(city: City): Promise<void> {
    const cities = await this.getAllCitiesFromLocalStorage();
    const index = cities.findIndex(c => c.id === city.id);
    
    if (index >= 0) {
      cities[index] = city;
    } else {
      cities.push(city);
    }
    
    localStorage.setItem('travelstory_cities', JSON.stringify(cities));
  }

  private async saveCitiesToLocalStorage(cities: City[]): Promise<void> {
    const existingCities = await this.getAllCitiesFromLocalStorage();
    const cityMap = new Map(existingCities.map(c => [c.id, c]));
    
    // Update or add new cities
    cities.forEach(city => {
      cityMap.set(city.id, city);
    });
    
    localStorage.setItem('travelstory_cities', JSON.stringify(Array.from(cityMap.values())));
  }

  private async getCityFromLocalStorage(id: string): Promise<City | null> {
    const cities = await this.getAllCitiesFromLocalStorage();
    return cities.find(c => c.id === id) || null;
  }

  private async getAllCitiesFromLocalStorage(): Promise<City[]> {
    try {
      const data = localStorage.getItem('travelstory_cities');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private async deleteCityFromLocalStorage(id: string): Promise<void> {
    const cities = await this.getAllCitiesFromLocalStorage();
    const filtered = cities.filter(c => c.id !== id);
    localStorage.setItem('travelstory_cities', JSON.stringify(filtered));
  }

  private async clearAllFromLocalStorage(): Promise<void> {
    localStorage.removeItem('travelstory_cities');
  }
}

