import { Injectable } from '@angular/core';

/**
 * StorageService - Abstraction layer for data persistence
 * 
 * Backend-ready: Currently uses localStorage/sessionStorage
 * Future: Replace with API calls when backend is available
 * 
 * This service handles all persistence concerns, making it easy
 * to switch from local storage to a real backend without changing
 * consuming components.
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly PREFIX = 'travelstory_';

  /**
   * Store data locally with automatic JSON serialization
   */
  setLocal<T>(key: string, value: T): void {
    try {
      localStorage.setItem(
        this.PREFIX + key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn('StorageService: Failed to save to localStorage', error);
    }
  }

  /**
   * Retrieve data with type safety
   */
  getLocal<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Remove specific item
   */
  removeLocal(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }

  /**
   * Session storage for temporary data (guest tracking)
   */
  setSession<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(
        this.PREFIX + key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn('StorageService: Failed to save to sessionStorage', error);
    }
  }

  getSession<T>(key: string, defaultValue: T): T {
    try {
      const item = sessionStorage.getItem(this.PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Clear all app data - useful for logout
   */
  clearAll(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
  }

  /**
   * Generate unique session ID for guest tracking
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique user ID
   */
  generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

