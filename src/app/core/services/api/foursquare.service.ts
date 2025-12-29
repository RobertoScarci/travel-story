import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of, forkJoin, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Foursquare Places API Service
 * 
 * Fetches real photos of attractions, restaurants, and venues
 * using the Foursquare Places API v3.
 */

export interface FoursquarePlace {
  fsq_id: string;
  name: string;
  location: {
    address?: string;
    locality?: string;
    country?: string;
    formatted_address?: string;
  };
  categories: Array<{
    id: number;
    name: string;
    icon: {
      prefix: string;
      suffix: string;
    };
  }>;
  distance?: number;
  rating?: number;
  photos?: FoursquarePhoto[];
}

export interface FoursquarePhoto {
  id: string;
  prefix: string;
  suffix: string;
  width: number;
  height: number;
  createdAt?: string;
}

export interface FoursquareSearchResponse {
  results: FoursquarePlace[];
}

@Injectable({
  providedIn: 'root'
})
export class FoursquareService {
  private readonly API_URL = 'https://api.foursquare.com/v3';
  private readonly API_KEY = environment.apiKeys.foursquare;
  private http = inject(HttpClient);

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': this.API_KEY,
      'Accept': 'application/json'
    });
  }

  /**
   * Search for places near a location
   * @param query Search query (e.g., "Colosseum", "restaurants")
   * @param lat Latitude
   * @param lng Longitude
   * @param categories Category IDs (optional)
   * @param limit Number of results
   */
  searchPlaces(
    query: string,
    lat: number,
    lng: number,
    categories?: string,
    limit: number = 10
  ): Observable<FoursquarePlace[]> {
    const params: Record<string, string> = {
      query,
      ll: `${lat},${lng}`,
      limit: limit.toString(),
      sort: 'RELEVANCE'
    };

    if (categories) {
      params['categories'] = categories;
    }

    return this.http.get<FoursquareSearchResponse>(`${this.API_URL}/places/search`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.results),
      catchError(error => {
        console.error('Foursquare search error:', error);
        return of([]);
      })
    );
  }

  /**
   * Get photos for a specific place
   * @param fsqId Foursquare place ID
   * @param limit Number of photos
   */
  getPlacePhotos(fsqId: string, limit: number = 5): Observable<FoursquarePhoto[]> {
    return this.http.get<FoursquarePhoto[]>(`${this.API_URL}/places/${fsqId}/photos`, {
      headers: this.getHeaders(),
      params: { limit: limit.toString() }
    }).pipe(
      catchError(error => {
        console.error('Foursquare photos error:', error);
        return of([]);
      })
    );
  }

  /**
   * Get full photo URL from Foursquare photo object
   * @param photo Foursquare photo object
   * @param size Photo size (e.g., "original", "300x300", "500x500")
   */
  getPhotoUrl(photo: FoursquarePhoto, size: string = '500x500'): string {
    return `${photo.prefix}${size}${photo.suffix}`;
  }

  /**
   * Search attractions near a city and get their photos
   * Categories for attractions: 16000 (Landmarks), 10000 (Arts & Entertainment)
   */
  getAttractionPhotos(
    cityName: string,
    lat: number,
    lng: number,
    limit: number = 6
  ): Observable<PlaceWithPhotos[]> {
    // Categories: 16000 = Landmarks, 10000 = Arts & Entertainment
    return this.searchPlaces(cityName, lat, lng, '16000,10000', limit).pipe(
      switchMap(places => {
        if (places.length === 0) return of([]);
        
        const photoRequests = places.map(place =>
          this.getPlacePhotos(place.fsq_id, 3).pipe(
            map(photos => ({
              ...place,
              photos,
              mainPhotoUrl: photos.length > 0 ? this.getPhotoUrl(photos[0], '600x400') : undefined
            }))
          )
        );
        
        return forkJoin(photoRequests);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Search restaurants near a city and get their photos
   * Categories for food: 13000 (Dining and Drinking)
   */
  getRestaurantPhotos(
    cityName: string,
    lat: number,
    lng: number,
    limit: number = 6
  ): Observable<PlaceWithPhotos[]> {
    // Category: 13000 = Dining and Drinking
    return this.searchPlaces(`${cityName} restaurant`, lat, lng, '13000', limit).pipe(
      switchMap(places => {
        if (places.length === 0) return of([]);
        
        const photoRequests = places.map(place =>
          this.getPlacePhotos(place.fsq_id, 3).pipe(
            map(photos => ({
              ...place,
              photos,
              mainPhotoUrl: photos.length > 0 ? this.getPhotoUrl(photos[0], '600x400') : undefined
            }))
          )
        );
        
        return forkJoin(photoRequests);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get photos for a specific place by name and location
   */
  getPlacePhotosByName(
    placeName: string,
    lat: number,
    lng: number
  ): Observable<string | undefined> {
    return this.searchPlaces(placeName, lat, lng, undefined, 1).pipe(
      switchMap(places => {
        if (places.length === 0) return of(undefined);
        return this.getPlacePhotos(places[0].fsq_id, 1).pipe(
          map(photos => photos.length > 0 ? this.getPhotoUrl(photos[0], '600x400') : undefined)
        );
      }),
      catchError(() => of(undefined))
    );
  }
}

export interface PlaceWithPhotos extends FoursquarePlace {
  mainPhotoUrl?: string;
}

