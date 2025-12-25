import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Unsplash photo data
 */
export interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  color: string; // Dominant color for placeholder
  description: string | null;
  altDescription: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string; // 1080px width
    small: string; // 400px width
    thumb: string; // 200px width
  };
  user: {
    name: string;
    username: string;
    portfolioUrl: string | null;
  };
  links: {
    html: string; // Link to photo page (for attribution)
  };
}

export interface UnsplashSearchResult {
  total: number;
  totalPages: number;
  results: UnsplashPhoto[];
}

/**
 * UnsplashService - High-quality photos from Unsplash
 * 
 * Free tier: 50 requests/hour
 * Docs: https://unsplash.com/documentation
 * 
 * Important: Always credit photographers!
 */
@Injectable({
  providedIn: 'root'
})
export class UnsplashService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.unsplash.com';
  private accessKey = environment.apiKeys.unsplash;

  // Cache for photos
  private cache = new Map<string, UnsplashPhoto[]>();

  /**
   * Search photos by query (city name, landmark, etc.)
   */
  searchPhotos(query: string, perPage: number = 10, page: number = 1): Observable<UnsplashPhoto[]> {
    const cacheKey = `${query}-${perPage}-${page}`;
    
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    if (!this.accessKey) {
      console.warn('Unsplash API key not configured');
      return of([]);
    }

    const headers = new HttpHeaders({
      'Authorization': `Client-ID ${this.accessKey}`
    });

    const params = {
      query,
      per_page: perPage.toString(),
      page: page.toString(),
      orientation: 'landscape'
    };

    return this.http.get<UnsplashSearchResponse>(`${this.baseUrl}/search/photos`, { headers, params }).pipe(
      map(response => {
        const photos = response.results.map(photo => this.mapPhoto(photo));
        this.cache.set(cacheKey, photos);
        return photos;
      }),
      catchError(error => {
        console.error('Unsplash API error:', error);
        return of([]);
      })
    );
  }

  /**
   * Get photos for a specific city
   */
  getCityPhotos(cityName: string, country?: string, count: number = 5): Observable<UnsplashPhoto[]> {
    const query = country ? `${cityName} ${country} city travel` : `${cityName} city travel`;
    return this.searchPhotos(query, count);
  }

  /**
   * Get a single random photo for a query
   */
  getRandomPhoto(query: string): Observable<UnsplashPhoto | null> {
    if (!this.accessKey) {
      return of(null);
    }

    const headers = new HttpHeaders({
      'Authorization': `Client-ID ${this.accessKey}`
    });

    const params = {
      query,
      orientation: 'landscape'
    };

    return this.http.get<UnsplashApiPhoto>(`${this.baseUrl}/photos/random`, { headers, params }).pipe(
      map(photo => this.mapPhoto(photo)),
      catchError(() => of(null))
    );
  }

  /**
   * Get photos by topic (travel, architecture, food, nature, etc.)
   */
  getPhotosByTopic(topic: string, cityName: string, count: number = 6): Observable<UnsplashPhoto[]> {
    const query = `${cityName} ${topic}`;
    return this.searchPhotos(query, count);
  }

  /**
   * Get food photos for a city
   */
  getFoodPhotos(cityName: string, country?: string, count: number = 4): Observable<UnsplashPhoto[]> {
    const query = country 
      ? `${cityName} ${country} food cuisine restaurant` 
      : `${cityName} food cuisine`;
    return this.searchPhotos(query, count);
  }

  /**
   * Get landmark/attraction photos
   */
  getLandmarkPhotos(cityName: string, count: number = 6): Observable<UnsplashPhoto[]> {
    return this.searchPhotos(`${cityName} landmark attraction`, count);
  }

  /**
   * Build optimized image URL with specific dimensions
   */
  getOptimizedUrl(photo: UnsplashPhoto, width: number, quality: number = 80): string {
    return `${photo.urls.raw}&w=${width}&q=${quality}&fit=crop&auto=format`;
  }

  /**
   * Build attribution text (required by Unsplash)
   */
  getAttribution(photo: UnsplashPhoto): string {
    return `Photo by ${photo.user.name} on Unsplash`;
  }

  /**
   * Build attribution link (required by Unsplash)
   */
  getAttributionLink(photo: UnsplashPhoto): string {
    return `${photo.links.html}?utm_source=travelstory&utm_medium=referral`;
  }

  private mapPhoto(photo: UnsplashApiPhoto): UnsplashPhoto {
    return {
      id: photo.id,
      width: photo.width,
      height: photo.height,
      color: photo.color,
      description: photo.description,
      altDescription: photo.alt_description,
      urls: {
        raw: photo.urls.raw,
        full: photo.urls.full,
        regular: photo.urls.regular,
        small: photo.urls.small,
        thumb: photo.urls.thumb
      },
      user: {
        name: photo.user.name,
        username: photo.user.username,
        portfolioUrl: photo.user.portfolio_url
      },
      links: {
        html: photo.links.html
      }
    };
  }
}

// Unsplash API Response types
interface UnsplashApiPhoto {
  id: string;
  width: number;
  height: number;
  color: string;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
    portfolio_url: string | null;
  };
  links: {
    html: string;
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashApiPhoto[];
}

