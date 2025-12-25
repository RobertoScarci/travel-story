import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Wikipedia summary data
 */
export interface WikipediaSummary {
  title: string;
  extract: string;
  description: string;
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
  originalImage?: {
    url: string;
    width: number;
    height: number;
  };
  coordinates?: {
    lat: number;
    lon: number;
  };
  contentUrls: {
    desktop: string;
    mobile: string;
  };
}

/**
 * WikipediaService - City descriptions from Wikipedia
 * 
 * Free API, no key required!
 * Uses the Wikipedia REST API (Wikimedia)
 * Docs: https://en.wikipedia.org/api/rest_v1/
 */
@Injectable({
  providedIn: 'root'
})
export class WikipediaService {
  private http = inject(HttpClient);
  private baseUrlIt = environment.apis.wikipediaIt;
  private baseUrlEn = environment.apis.wikipedia;

  /**
   * Get summary for a city (tries Italian first, then English)
   */
  getCitySummary(cityName: string, country?: string): Observable<WikipediaSummary | null> {
    const searchTerm = this.formatSearchTerm(cityName, country);
    
    // Try Italian Wikipedia first
    return this.fetchSummary(this.baseUrlIt, searchTerm).pipe(
      switchMap(result => {
        if (result) {
          return of(result);
        }
        // Fallback to English Wikipedia
        return this.fetchSummary(this.baseUrlEn, cityName);
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Get summary in a specific language
   */
  getSummaryByLanguage(cityName: string, language: 'it' | 'en' = 'it'): Observable<WikipediaSummary | null> {
    const baseUrl = language === 'it' ? this.baseUrlIt : this.baseUrlEn;
    return this.fetchSummary(baseUrl, cityName);
  }

  /**
   * Search for related articles
   */
  searchArticles(query: string, limit: number = 5): Observable<WikiSearchResult[]> {
    const url = `${this.baseUrlIt}/page/related/${encodeURIComponent(query)}`;
    
    return this.http.get<WikiRelatedResponse>(url).pipe(
      map(response => 
        response.pages?.slice(0, limit).map(page => ({
          title: page.title,
          description: page.description || '',
          thumbnail: page.thumbnail?.source || null,
          extract: page.extract || ''
        })) || []
      ),
      catchError(() => of([]))
    );
  }

  /**
   * Get "On This Day" facts for engagement
   */
  getOnThisDay(): Observable<WikiOnThisDay[]> {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const url = `${this.baseUrlIt}/feed/onthisday/events/${month}/${day}`;

    return this.http.get<WikiOnThisDayResponse>(url).pipe(
      map(response => 
        response.events?.slice(0, 5).map(event => ({
          year: event.year,
          text: event.text,
          pages: event.pages?.map(p => p.title) || []
        })) || []
      ),
      catchError(() => of([]))
    );
  }

  private fetchSummary(baseUrl: string, title: string): Observable<WikipediaSummary | null> {
    const url = `${baseUrl}/page/summary/${encodeURIComponent(title)}`;

    return this.http.get<WikiSummaryResponse>(url).pipe(
      map(response => {
        if (response.type === 'disambiguation' || !response.extract) {
          return null;
        }
        return this.mapSummary(response);
      }),
      catchError(() => of(null))
    );
  }

  private mapSummary(response: WikiSummaryResponse): WikipediaSummary {
    return {
      title: response.title,
      extract: response.extract,
      description: response.description || '',
      thumbnail: response.thumbnail ? {
        url: response.thumbnail.source,
        width: response.thumbnail.width,
        height: response.thumbnail.height
      } : undefined,
      originalImage: response.originalimage ? {
        url: response.originalimage.source,
        width: response.originalimage.width,
        height: response.originalimage.height
      } : undefined,
      coordinates: response.coordinates ? {
        lat: response.coordinates.lat,
        lon: response.coordinates.lon
      } : undefined,
      contentUrls: {
        desktop: response.content_urls?.desktop?.page || '',
        mobile: response.content_urls?.mobile?.page || ''
      }
    };
  }

  private formatSearchTerm(cityName: string, country?: string): string {
    // Some cities need country specification for accurate results
    const cityMappings: Record<string, string> = {
      'tokyo': 'Tokyo',
      'lisbon': 'Lisbona',
      'lisbona': 'Lisbona',
      'marrakech': 'Marrakech',
      'new york': 'New York',
      'newyork': 'New York',
      'bali': 'Bali',
      'barcelona': 'Barcellona',
      'barcellona': 'Barcellona',
      'reykjavik': 'Reykjavík',
      'cape town': 'Città del Capo',
      'capetown': 'Città del Capo',
      'città del capo': 'Città del Capo',
      'paris': 'Parigi',
      'parigi': 'Parigi',
      'london': 'Londra',
      'londra': 'Londra',
      'rome': 'Roma',
      'roma': 'Roma',
      'berlin': 'Berlino',
      'berlino': 'Berlino',
      'amsterdam': 'Amsterdam',
      'prague': 'Praga',
      'praga': 'Praga',
      'vienna': 'Vienna',
      'budapest': 'Budapest',
      'athens': 'Atene',
      'atene': 'Atene',
      'dubai': 'Dubai',
      'singapore': 'Singapore',
      'bangkok': 'Bangkok',
      'sydney': 'Sydney',
      'melbourne': 'Melbourne',
    };

    const normalizedName = cityName.toLowerCase().trim();
    return cityMappings[normalizedName] || cityName;
  }
}

// Wikipedia API Response types
interface WikiSummaryResponse {
  type: string;
  title: string;
  extract: string;
  description?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  coordinates?: {
    lat: number;
    lon: number;
  };
  content_urls?: {
    desktop?: { page: string };
    mobile?: { page: string };
  };
}

interface WikiRelatedResponse {
  pages?: Array<{
    title: string;
    description?: string;
    thumbnail?: { source: string };
    extract?: string;
  }>;
}

interface WikiOnThisDayResponse {
  events?: Array<{
    year: number;
    text: string;
    pages?: Array<{ title: string }>;
  }>;
}

export interface WikiSearchResult {
  title: string;
  description: string;
  thumbnail: string | null;
  extract: string;
}

export interface WikiOnThisDay {
  year: number;
  text: string;
  pages: string[];
}

