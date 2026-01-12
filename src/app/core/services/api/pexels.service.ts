import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Pexels photo data
 */
export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographerUrl: string;
  src: {
    original: string;
    large2x: string; // 2048px width
    large: string; // 1280px width
    medium: string; // 1080px width
    small: string; // 400px width
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt?: string;
}

export interface PexelsSearchResult {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

/**
 * PexelsService - High-quality photos from Pexels
 * 
 * Free tier: 200 requests/hour (4x more than Unsplash!)
 * No attribution required for commercial use
 * Docs: https://www.pexels.com/api/documentation/
 * 
 * Get API key: https://www.pexels.com/api/new/
 */
@Injectable({
  providedIn: 'root'
})
export class PexelsService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.pexels.com/v1';
  private apiKey = environment.apiKeys.pexels;

  // Cache for photos
  private cache = new Map<string, PexelsPhoto[]>();

  /**
   * Search photos by query (city name, landmark, etc.)
   */
  searchPhotos(query: string, perPage: number = 15, page: number = 1): Observable<PexelsPhoto[]> {
    const cacheKey = `pexels-${query}-${perPage}-${page}`;
    
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    if (!this.apiKey) {
      console.warn('Pexels API key not configured');
      return of([]);
    }

    const headers = new HttpHeaders({
      'Authorization': this.apiKey
    });

    const params = {
      query,
      per_page: perPage.toString(),
      page: page.toString(),
      orientation: 'landscape'
    };

    return this.http.get<PexelsSearchResult>(`${this.baseUrl}/search`, { headers, params }).pipe(
      map(response => {
        const photos = response.photos || [];
        this.cache.set(cacheKey, photos);
        return photos;
      }),
      catchError(error => {
        console.error('Pexels API error:', error);
        return of([]);
      })
    );
  }

  /**
   * Get photos for a specific city
   */
  getCityPhotos(cityName: string, country?: string, count: number = 5): Observable<PexelsPhoto[]> {
    const query = country ? `${cityName} ${country} city travel` : `${cityName} city travel`;
    return this.searchPhotos(query, count);
  }

  /**
   * Get a random photo for a query
   */
  getRandomPhoto(query: string): Observable<PexelsPhoto | null> {
    return this.searchPhotos(query, 1).pipe(
      map(photos => photos.length > 0 ? photos[0] : null),
      catchError(() => of(null))
    );
  }

  /**
   * Get curated photos (high quality, no query needed)
   */
  getCuratedPhotos(perPage: number = 15, page: number = 1): Observable<PexelsPhoto[]> {
    if (!this.apiKey) {
      return of([]);
    }

    const headers = new HttpHeaders({
      'Authorization': this.apiKey
    });

    const params = {
      per_page: perPage.toString(),
      page: page.toString()
    };

    return this.http.get<PexelsSearchResult>(`${this.baseUrl}/curated`, { headers, params }).pipe(
      map(response => response.photos || []),
      catchError(() => of([]))
    );
  }

  /**
   * Build optimized image URL with specific dimensions
   */
  getOptimizedUrl(photo: PexelsPhoto, width: number): string {
    if (width >= 2048) {
      return photo.src.large2x;
    } else if (width >= 1280) {
      return photo.src.large;
    } else if (width >= 1080) {
      return photo.src.medium;
    } else if (width >= 400) {
      return photo.src.small;
    }
    return photo.src.medium; // Default to medium
  }

  /**
   * Build thumbnail URL (1200px)
   */
  getThumbnailUrl(photo: PexelsPhoto): string {
    return photo.src.large; // 1280px is good for thumbnails
  }

  /**
   * Build hero image URL (1920px)
   */
  getHeroUrl(photo: PexelsPhoto): string {
    return photo.src.large2x; // 2048px is good for hero images
  }
}

