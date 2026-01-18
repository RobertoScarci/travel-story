import { Injectable, inject } from '@angular/core';
import { CityService } from './city.service';
import { City } from '../models/city.model';

export interface SearchSuggestion {
  city: City;
  matchType: 'name' | 'country' | 'tag' | 'continent';
  matchScore: number;
  highlightedText?: string;
}

/**
 * SearchService - Advanced search with autocomplete
 * 
 * Features:
 * - Fuzzy matching for better search results
 * - Autocomplete suggestions
 * - Search by name, country, continent, tags
 * - Relevance scoring
 */
@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private cityService = inject(CityService);

  /**
   * Get autocomplete suggestions based on query
   */
  getSuggestions(query: string, limit: number = 5): SearchSuggestion[] {
    if (!query || query.length < 2) {
      return [];
    }

    const lowercaseQuery = query.toLowerCase().trim();
    const suggestions: SearchSuggestion[] = [];
    const cities = this.cityService.getAllCities();

    for (const city of cities) {
      // Check name match (highest priority)
      const nameMatch = this.fuzzyMatch(city.name.toLowerCase(), lowercaseQuery);
      if (nameMatch.score > 0.3) {
        suggestions.push({
          city,
          matchType: 'name',
          matchScore: nameMatch.score * 1.0, // Full weight for name
          highlightedText: this.highlightMatch(city.name, lowercaseQuery)
        });
        continue;
      }

      // Check country match
      const countryMatch = this.fuzzyMatch(city.country.toLowerCase(), lowercaseQuery);
      if (countryMatch.score > 0.4) {
        suggestions.push({
          city,
          matchType: 'country',
          matchScore: countryMatch.score * 0.8, // 80% weight for country
          highlightedText: this.highlightMatch(city.country, lowercaseQuery)
        });
        continue;
      }

      // Check continent match
      const continentMatch = this.fuzzyMatch(city.continent.toLowerCase(), lowercaseQuery);
      if (continentMatch.score > 0.5) {
        suggestions.push({
          city,
          matchType: 'continent',
          matchScore: continentMatch.score * 0.6, // 60% weight for continent
          highlightedText: this.highlightMatch(city.continent, lowercaseQuery)
        });
        continue;
      }

      // Check tag matches
      for (const tag of city.tags) {
        const tagMatch = this.fuzzyMatch(tag.toLowerCase(), lowercaseQuery);
        if (tagMatch.score > 0.5) {
          suggestions.push({
            city,
            matchType: 'tag',
            matchScore: tagMatch.score * 0.5, // 50% weight for tags
            highlightedText: this.highlightMatch(tag, lowercaseQuery)
          });
          break; // Only add once per city for tag matches
        }
      }
    }

    // Remove duplicates (same city can appear multiple times)
    const uniqueSuggestions = this.removeDuplicates(suggestions);

    // Sort by match score (highest first)
    uniqueSuggestions.sort((a, b) => b.matchScore - a.matchScore);

    // Return top suggestions
    return uniqueSuggestions.slice(0, limit);
  }

  /**
   * Advanced search with multiple criteria
   */
  search(query: string, options?: {
    limit?: number;
    minScore?: number;
  }): City[] {
    if (!query || query.length < 2) {
      return [];
    }

    const limit = options?.limit || 50;
    const minScore = options?.minScore || 0.2;
    const lowercaseQuery = query.toLowerCase().trim();
    const cities = this.cityService.getAllCities();
    const results: Array<{ city: City; score: number }> = [];

    for (const city of cities) {
      let totalScore = 0;
      let matchCount = 0;

      // Name match (highest weight)
      const nameMatch = this.fuzzyMatch(city.name.toLowerCase(), lowercaseQuery);
      if (nameMatch.score > 0) {
        totalScore += nameMatch.score * 1.0;
        matchCount++;
      }

      // Country match
      const countryMatch = this.fuzzyMatch(city.country.toLowerCase(), lowercaseQuery);
      if (countryMatch.score > 0) {
        totalScore += countryMatch.score * 0.7;
        matchCount++;
      }

      // Continent match
      const continentMatch = this.fuzzyMatch(city.continent.toLowerCase(), lowercaseQuery);
      if (continentMatch.score > 0) {
        totalScore += continentMatch.score * 0.5;
        matchCount++;
      }

      // Tag matches (average of all matching tags)
      let tagScoreSum = 0;
      let tagCount = 0;
      for (const tag of city.tags) {
        const tagMatch = this.fuzzyMatch(tag.toLowerCase(), lowercaseQuery);
        if (tagMatch.score > 0) {
          tagScoreSum += tagMatch.score;
          tagCount++;
        }
      }
      if (tagCount > 0) {
        totalScore += (tagScoreSum / tagCount) * 0.4;
        matchCount++;
      }

      // Calculate average score
      const avgScore = matchCount > 0 ? totalScore / matchCount : 0;

      if (avgScore >= minScore) {
        results.push({ city, score: avgScore });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit).map(r => r.city);
  }

  /**
   * Simple fuzzy matching algorithm
   * Returns a score between 0 and 1
   */
  private fuzzyMatch(text: string, query: string): { score: number; matched: boolean } {
    if (text === query) {
      return { score: 1.0, matched: true };
    }

    if (text.startsWith(query)) {
      return { score: 0.9, matched: true };
    }

    if (text.includes(query)) {
      return { score: 0.7, matched: true };
    }

    // Check for character sequence match (fuzzy)
    let textIndex = 0;
    let queryIndex = 0;
    let matchCount = 0;

    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex] === query[queryIndex]) {
        matchCount++;
        queryIndex++;
      }
      textIndex++;
    }

    if (queryIndex === query.length) {
      // All query characters found in order
      const score = matchCount / query.length;
      return { score: Math.max(0.3, score * 0.6), matched: true };
    }

    return { score: 0, matched: false };
  }

  /**
   * Highlight matching text in result
   */
  private highlightMatch(text: string, query: string): string {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return text;
    }

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return `${before}<strong>${match}</strong>${after}`;
  }

  /**
   * Remove duplicate cities from suggestions
   */
  private removeDuplicates(suggestions: SearchSuggestion[]): SearchSuggestion[] {
    const seen = new Set<string>();
    const unique: SearchSuggestion[] = [];

    for (const suggestion of suggestions) {
      if (!seen.has(suggestion.city.id)) {
        seen.add(suggestion.city.id);
        unique.push(suggestion);
      } else {
        // If city already exists, keep the one with higher score
        const existingIndex = unique.findIndex(s => s.city.id === suggestion.city.id);
        if (existingIndex !== -1 && suggestion.matchScore > unique[existingIndex].matchScore) {
          unique[existingIndex] = suggestion;
        }
      }
    }

    return unique;
  }
}
