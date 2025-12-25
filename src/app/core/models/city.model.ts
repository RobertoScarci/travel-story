/**
 * Core data models for city information
 * Backend-ready: these interfaces mirror expected API responses
 */

import { WeatherData, WeatherForecast } from '../services/api/weather.service';
import { WikipediaSummary } from '../services/api/wikipedia.service';
import { CountryInfo } from '../services/api/country.service';
import { UnsplashPhoto } from '../services/api/unsplash.service';

export interface City {
  id: string;
  name: string;
  country: string;
  continent: string;
  tagline: string;
  heroImage: string;
  thumbnailImage: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  tags: string[];
  rating: number;
  popularityScore: number;
  priceLevel: 1 | 2 | 3 | 4 | 5; // € to €€€€€
  bestPeriod: string[];
  suggestedDays: { min: number; max: number };
  timezone: string;
  language: string[];
  currency: string;
  emergencyNumber: string;
}

/**
 * Extended city data with live API information
 */
export interface CityLiveData {
  weather?: WeatherData;
  forecast?: WeatherForecast;
  wikipedia?: WikipediaSummary;
  country?: CountryInfo;
  photos?: UnsplashPhoto[];
  foodPhotos?: UnsplashPhoto[];
}

export interface CityDetails extends City {
  story: CityStory;
  sections: CitySection[];
  practicalInfo: PracticalInfo;
  safety: SafetyInfo;
  viralContent: ViralContent[];
  flightDeals: FlightDeal[];
}

export interface CityStory {
  intro: string; // Emotional introduction
  atmosphere: string;
  uniqueAspect: string;
  travellerTypes: string[];
}

export interface CitySection {
  id: string;
  type: 'see' | 'eat' | 'history' | 'practical' | 'tips' | 'iconic';
  title: string;
  icon: string;
  items: SectionItem[];
}

export interface SectionItem {
  id: string;
  title: string;
  description: string;
  image?: string;
  location?: string;
  priceRange?: string;
  duration?: string;
  tags?: string[];
  externalLink?: string;
}

export interface PracticalInfo {
  documents: string;
  bestTimeToVisit: string;
  averageCosts: {
    meal: string;
    transport: string;
    accommodation: string;
  };
  gettingAround: string[];
  tipsFromLocals: string[];
}

export interface SafetyInfo {
  overallLevel: 'very-safe' | 'safe' | 'moderate' | 'caution' | 'avoid';
  currentAlerts: string[];
  healthTips: string[];
  scamsToAvoid: string[];
  emergencyContacts: {
    police: string;
    medical: string;
    embassy?: string;
  };
}

export interface ViralContent {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  title: string;
  thumbnail: string;
  externalUrl: string;
  creator: string;
  views: string;
}

export interface FlightDeal {
  id: string;
  provider: string;
  price: number;
  currency: string;
  departureCity: string;
  dates: string;
  redirectUrl: string;
}

export interface CityComparison {
  cities: City[];
  criteria: ComparisonCriteria[];
}

export interface ComparisonCriteria {
  key: string;
  label: string;
  icon: string;
}

