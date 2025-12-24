/**
 * User models for personalization system
 * Backend-ready: designed for future API integration
 */

export type UserType = 'guest' | 'registered';

export interface User {
  id: string;
  type: UserType;
  email?: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  lastVisit: Date;
}

export interface GuestUser extends User {
  type: 'guest';
  sessionId: string;
}

export interface RegisteredUser extends User {
  type: 'registered';
  email: string;
  preferences: UserPreferences;
  travelHistory: TravelHistoryItem[];
  savedCities: string[]; // City IDs
  completedJourneys: Journey[];
}

export interface UserPreferences {
  travelStyle: TravelStyle[];
  budgetLevel: 1 | 2 | 3 | 4 | 5;
  interests: string[];
  preferredClimates: Climate[];
  avoidCrowds: boolean;
  accessibilityNeeds: string[];
}

export type TravelStyle = 
  | 'adventure'
  | 'relaxation'
  | 'cultural'
  | 'foodie'
  | 'nightlife'
  | 'nature'
  | 'romantic'
  | 'family'
  | 'budget'
  | 'luxury';

export type Climate = 'tropical' | 'mediterranean' | 'temperate' | 'cold' | 'desert';

export interface TravelHistoryItem {
  cityId: string;
  visitedAt: Date;
  sectionsExplored: string[];
  timeSpent: number; // seconds
  interactions: UserInteraction[];
}

export interface UserInteraction {
  type: 'view' | 'save' | 'share' | 'click_external' | 'expand_section';
  target: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Journey {
  id: string;
  cityId: string;
  startDate: Date;
  endDate?: Date;
  rating?: number;
  notes?: string;
}

/**
 * Tracking payload for analytics - privacy-conscious design
 * Guest: minimal tracking, session-based
 * Registered: full personalization with explicit consent
 */
export interface TrackingEvent {
  userId: string;
  userType: UserType;
  event: string;
  data: Record<string, unknown>;
  timestamp: Date;
  sessionId: string;
}

export interface PersonalizationProfile {
  userId: string;
  userType: UserType;
  recentlyViewed: string[]; // City IDs, max 10
  implicitInterests: string[]; // Derived from behavior
  explicitPreferences?: UserPreferences; // Only for registered users
  recommendationScore: Record<string, number>; // City ID -> score
}

