import { Injectable, computed } from '@angular/core';
import { UserService } from './user.service';
import { CityService } from './city.service';
import { StorageService } from './storage.service';
import { City } from '../models/city.model';
import { PersonalizationProfile, TravelStyle } from '../models/user.model';

/**
 * PersonalizationService - The "memory" of the application
 * 
 * Responsibilities:
 * - Build personalization profiles from user behavior
 * - Generate recommendations based on implicit/explicit preferences
 * - Differentiate experience between guest and registered users
 * 
 * Philosophy: "Il sito si ricorda di me"
 * Creates a progressive relationship where the app evolves with the user.
 */
@Injectable({
  providedIn: 'root'
})
export class PersonalizationService {
  private readonly PROFILE_KEY = 'personalization_profile';

  // Computed recommendations based on user state
  readonly hasPersonalization = computed(() => {
    const profile = this.getProfile();
    return profile.recentlyViewed.length > 0 || 
           (profile.explicitPreferences?.interests?.length ?? 0) > 0;
  });

  constructor(
    private userService: UserService,
    private cityService: CityService,
    private storage: StorageService
  ) {}

  /**
   * Get or create personalization profile for current user
   */
  getProfile(): PersonalizationProfile {
    const user = this.userService.user();
    const defaultProfile: PersonalizationProfile = {
      userId: user?.id || 'anonymous',
      userType: user?.type || 'guest',
      recentlyViewed: [],
      implicitInterests: [],
      recommendationScore: {}
    };

    const savedProfile = this.storage.getLocal<PersonalizationProfile>(
      this.PROFILE_KEY,
      defaultProfile
    );

    // Merge with travel history
    const history = this.userService.getTravelHistory();
    savedProfile.recentlyViewed = history.slice(0, 10).map(h => h.cityId);

    return savedProfile;
  }

  /**
   * Update profile with new interaction data
   */
  private updateProfile(updates: Partial<PersonalizationProfile>): void {
    const current = this.getProfile();
    const updated = { ...current, ...updates };
    this.storage.setLocal(this.PROFILE_KEY, updated);
  }

  /**
   * Analyze user behavior to derive implicit interests
   * This is the "magic" that makes the site feel personal
   */
  analyzeImplicitInterests(): string[] {
    const history = this.userService.getTravelHistory();
    const interestMap = new Map<string, number>();

    history.forEach(entry => {
      // Weight by recency (more recent = higher weight)
      const daysSinceVisit = Math.floor(
        (Date.now() - new Date(entry.visitedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyWeight = Math.max(0.1, 1 - daysSinceVisit * 0.05);

      // Analyze sections explored
      entry.sectionsExplored.forEach(section => {
        const current = interestMap.get(section) || 0;
        interestMap.set(section, current + recencyWeight);
      });

      // Analyze interaction types
      entry.interactions.forEach(interaction => {
        if (interaction.type === 'save' || interaction.type === 'expand_section') {
          const current = interestMap.get(interaction.target) || 0;
          interestMap.set(interaction.target, current + recencyWeight * 2);
        }
      });
    });

    // Sort by score and return top interests
    return Array.from(interestMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([interest]) => interest);
  }

  /**
   * Get personalized city recommendations
   * Different logic for guest vs registered users
   */
  getRecommendations(limit: number = 6): City[] {
    const allCities = this.cityService.getAllCities();
    const profile = this.getProfile();
    const history = this.userService.getTravelHistory();
    const visitedIds = new Set(history.map(h => h.cityId));

    // Calculate scores for each city
    const scoredCities = allCities
      .filter(city => !visitedIds.has(city.id)) // Exclude already visited
      .map(city => ({
        city,
        score: this.calculateRecommendationScore(city, profile)
      }))
      .sort((a, b) => b.score - a.score);

    return scoredCities.slice(0, limit).map(s => s.city);
  }

  /**
   * Calculate recommendation score for a city
   */
  private calculateRecommendationScore(
    city: City,
    profile: PersonalizationProfile
  ): number {
    let score = city.popularityScore; // Base score

    // Boost for matching implicit interests
    const implicitInterests = this.analyzeImplicitInterests();
    city.tags.forEach(tag => {
      if (implicitInterests.includes(tag)) {
        score += 20;
      }
    });

    // For registered users, use explicit preferences
    if (profile.explicitPreferences) {
      const prefs = profile.explicitPreferences;
      
      // Match travel style
      const styleMatches = city.tags.filter(tag => 
        prefs.travelStyle.includes(tag as TravelStyle)
      ).length;
      score += styleMatches * 15;

      // Match budget level
      const budgetDiff = Math.abs(city.priceLevel - prefs.budgetLevel);
      score -= budgetDiff * 10;

      // Match interests
      const interestMatches = city.tags.filter(tag =>
        prefs.interests.includes(tag)
      ).length;
      score += interestMatches * 10;
    }

    // Slight randomization for freshness
    score += Math.random() * 5;

    return score;
  }

  /**
   * Get cities similar to a given city
   */
  getSimilarCities(cityId: string, limit: number = 4): City[] {
    const targetCity = this.cityService.getCityById(cityId);
    if (!targetCity) return [];

    const allCities = this.cityService.getAllCities()
      .filter(c => c.id !== cityId);

    return allCities
      .map(city => ({
        city,
        similarity: this.calculateSimilarity(targetCity, city)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => s.city);
  }

  /**
   * Calculate similarity between two cities
   */
  private calculateSimilarity(city1: City, city2: City): number {
    let similarity = 0;

    // Same continent bonus
    if (city1.continent === city2.continent) similarity += 20;

    // Similar price level
    similarity -= Math.abs(city1.priceLevel - city2.priceLevel) * 5;

    // Matching tags
    const matchingTags = city1.tags.filter(tag => city2.tags.includes(tag));
    similarity += matchingTags.length * 15;

    return similarity;
  }

  /**
   * Get "Why this city for you" explanation
   * Personalizes the recommendation message
   */
  getRecommendationReason(city: City): string {
    const profile = this.getProfile();
    const implicitInterests = this.analyzeImplicitInterests();
    
    // Find matching interests
    const matchingTags = city.tags.filter(tag => 
      implicitInterests.includes(tag) ||
      profile.explicitPreferences?.interests.includes(tag)
    );

    if (matchingTags.length > 0) {
      const tagLabels: Record<string, string> = {
        'cultural': 'ami la cultura',
        'foodie': 'adori il cibo locale',
        'adventure': 'cerchi avventura',
        'relaxation': 'vuoi rilassarti',
        'nightlife': 'ami la vita notturna',
        'nature': 'ami la natura',
        'romantic': 'cerchi romanticismo',
        'budget': 'viaggi con budget',
        'luxury': 'ami il lusso',
        'history': 'ami la storia'
      };

      const reasons = matchingTags
        .map(tag => tagLabels[tag])
        .filter(Boolean)
        .slice(0, 2);

      if (reasons.length > 0) {
        return `Per te`;
      }
    }

    // Fallback to generic reasons - shortened
    if (city.popularityScore > 80) {
      return 'Top trend';
    }
    if (city.priceLevel <= 2) {
      return 'Best value';
    }

    return 'Da scoprire';
  }

  /**
   * Get greeting message based on user state and time
   * Returns object with greeting parts for flexible display
   */
  getPersonalizedGreeting(): { greeting: string; name?: string; tagline?: string } {
    const user = this.userService.user();
    const hour = new Date().getHours();
    
    let timeGreeting: string;
    if (hour < 12) timeGreeting = 'Ciao';
    else if (hour < 18) timeGreeting = 'Ciao';
    else timeGreeting = 'Ciao';

    if (user?.type === 'registered') {
      const name = this.userService.userName();
      return {
        greeting: timeGreeting,
        name: name,
        tagline: 'pronto a partire?'
      };
    }

    const history = this.userService.getTravelHistory();
    if (history.length > 0) {
      return {
        greeting: timeGreeting,
        name: 'esploratore',
        tagline: 'bentornato'
      };
    }

    return {
      greeting: timeGreeting,
      tagline: 'dove andiamo?'
    };
  }

  /**
   * Check if user should see "Consigliato per te" section
   */
  shouldShowPersonalizedSection(): boolean {
    const history = this.userService.getTravelHistory();
    return history.length >= 2; // Show after visiting at least 2 cities
  }

  /**
   * Get section visibility based on user journey
   * Progressive disclosure based on engagement
   */
  getSectionVisibility(): {
    showRecommended: boolean;
    showRecent: boolean;
    showComparisons: boolean;
    showDeals: boolean;
  } {
    const history = this.userService.getTravelHistory();
    const isRegistered = this.userService.isAuthenticated();

    return {
      showRecommended: history.length >= 2,
      showRecent: history.length >= 1,
      showComparisons: history.length >= 3 || isRegistered,
      showDeals: true // Always show deals
    };
  }
}

