import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import {
  User,
  GuestUser,
  RegisteredUser,
  UserType,
  UserPreferences,
  TravelHistoryItem,
  UserInteraction
} from '../models/user.model';

/**
 * UserService - Core service for user state management
 * 
 * Responsibilities:
 * - Manage user authentication state (guest vs registered)
 * - Track user interactions for personalization
 * - Persist user data locally (backend-ready)
 * 
 * Philosophy: "Il sito si ricorda di me"
 * Every interaction leaves a mark, building a personalized experience.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly USER_KEY = 'current_user';
  private readonly HISTORY_KEY = 'travel_history';

  // Reactive state using Angular Signals
  private userSignal = signal<User | null>(null);
  
  // Public computed values for components
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal()?.type === 'registered');
  readonly isGuest = computed(() => this.userSignal()?.type === 'guest');
  readonly userName = computed(() => {
    const user = this.userSignal();
    if (user?.type === 'registered') {
      return (user as RegisteredUser).name || 'Viaggiatore';
    }
    return 'Esploratore';
  });

  constructor(private storage: StorageService) {
    this.initializeUser();
  }

  /**
   * Initialize user on app start
   * Creates a guest user if no user exists
   */
  private initializeUser(): void {
    const savedUser = this.storage.getLocal<User | null>(this.USER_KEY, null);
    
    if (savedUser) {
      // Update last visit
      savedUser.lastVisit = new Date();
      this.userSignal.set(savedUser);
      this.persistUser();
    } else {
      // Create new guest user
      this.createGuestUser();
    }
  }

  /**
   * Create a new guest user with session tracking
   */
  private createGuestUser(): void {
    const guestUser: GuestUser = {
      id: this.storage.generateUserId(),
      type: 'guest',
      sessionId: this.storage.generateSessionId(),
      createdAt: new Date(),
      lastVisit: new Date()
    };
    
    this.userSignal.set(guestUser);
    this.persistUser();
  }

  /**
   * Upgrade guest to registered user
   * Preserves all tracking history from guest session
   */
  register(email: string, name: string, preferences?: Partial<UserPreferences>): void {
    const currentUser = this.userSignal();
    const existingHistory = this.getTravelHistory();

    const registeredUser: RegisteredUser = {
      id: currentUser?.id || this.storage.generateUserId(),
      type: 'registered',
      email,
      name,
      createdAt: currentUser?.createdAt || new Date(),
      lastVisit: new Date(),
      preferences: {
        travelStyle: [],
        budgetLevel: 3,
        interests: [],
        preferredClimates: [],
        avoidCrowds: false,
        accessibilityNeeds: [],
        ...preferences
      },
      travelHistory: existingHistory,
      savedCities: [],
      completedJourneys: []
    };

    this.userSignal.set(registeredUser);
    this.persistUser();
  }

  /**
   * Simulate login - Backend-ready
   * In production, this would call an authentication API
   */
  login(email: string, _password: string): Promise<boolean> {
    // Simulated login - replace with API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // For demo, auto-create user if not exists
        this.register(email, email.split('@')[0]);
        resolve(true);
      }, 500);
    });
  }

  /**
   * Logout - returns to guest mode
   */
  logout(): void {
    this.storage.removeLocal(this.USER_KEY);
    this.createGuestUser();
  }

  /**
   * Update user preferences (registered users only)
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    const user = this.userSignal();
    if (user?.type === 'registered') {
      const registered = user as RegisteredUser;
      registered.preferences = { ...registered.preferences, ...preferences };
      this.userSignal.set({ ...registered });
      this.persistUser();
    }
  }

  /**
   * Save a city to favorites
   */
  saveCity(cityId: string): void {
    const user = this.userSignal();
    if (user?.type === 'registered') {
      const registered = user as RegisteredUser;
      if (!registered.savedCities.includes(cityId)) {
        registered.savedCities = [...registered.savedCities, cityId];
        this.userSignal.set({ ...registered });
        this.persistUser();
      }
    }
  }

  /**
   * Remove city from favorites
   */
  unsaveCity(cityId: string): void {
    const user = this.userSignal();
    if (user?.type === 'registered') {
      const registered = user as RegisteredUser;
      registered.savedCities = registered.savedCities.filter(id => id !== cityId);
      this.userSignal.set({ ...registered });
      this.persistUser();
    }
  }

  /**
   * Check if city is saved
   */
  isCitySaved(cityId: string): boolean {
    const user = this.userSignal();
    if (user?.type === 'registered') {
      return (user as RegisteredUser).savedCities.includes(cityId);
    }
    return false;
  }

  /**
   * Track city visit - works for both guest and registered
   */
  trackCityVisit(cityId: string): void {
    const history = this.getTravelHistory();
    const existingEntry = history.find(h => h.cityId === cityId);

    if (existingEntry) {
      existingEntry.visitedAt = new Date();
      existingEntry.timeSpent += 1;
    } else {
      history.unshift({
        cityId,
        visitedAt: new Date(),
        sectionsExplored: [],
        timeSpent: 0,
        interactions: []
      });
    }

    // Keep only last 20 entries for guests, unlimited for registered
    const maxEntries = this.isAuthenticated() ? 100 : 20;
    const trimmedHistory = history.slice(0, maxEntries);
    
    this.storage.setLocal(this.HISTORY_KEY, trimmedHistory);
    
    // Update user if registered
    if (this.isAuthenticated()) {
      const user = this.userSignal() as RegisteredUser;
      user.travelHistory = trimmedHistory;
      this.userSignal.set({ ...user });
      this.persistUser();
    }
  }

  /**
   * Track section exploration within a city
   */
  trackSectionExplored(cityId: string, sectionId: string): void {
    const history = this.getTravelHistory();
    const entry = history.find(h => h.cityId === cityId);
    
    if (entry && !entry.sectionsExplored.includes(sectionId)) {
      entry.sectionsExplored.push(sectionId);
      this.storage.setLocal(this.HISTORY_KEY, history);
    }
  }

  /**
   * Track user interaction for analytics and personalization
   */
  trackInteraction(cityId: string, interaction: Omit<UserInteraction, 'timestamp'>): void {
    const history = this.getTravelHistory();
    const entry = history.find(h => h.cityId === cityId);
    
    if (entry) {
      entry.interactions.push({
        ...interaction,
        timestamp: new Date()
      });
      this.storage.setLocal(this.HISTORY_KEY, history);
    }
  }

  /**
   * Get travel history for current user
   */
  getTravelHistory(): TravelHistoryItem[] {
    return this.storage.getLocal<TravelHistoryItem[]>(this.HISTORY_KEY, []);
  }

  /**
   * Get recently viewed city IDs
   */
  getRecentlyViewedCities(limit: number = 5): string[] {
    return this.getTravelHistory()
      .slice(0, limit)
      .map(h => h.cityId);
  }

  /**
   * Persist user to storage
   */
  private persistUser(): void {
    const user = this.userSignal();
    if (user) {
      this.storage.setLocal(this.USER_KEY, user);
    }
  }

  /**
   * Get current user type
   */
  getUserType(): UserType {
    return this.userSignal()?.type || 'guest';
  }
}

