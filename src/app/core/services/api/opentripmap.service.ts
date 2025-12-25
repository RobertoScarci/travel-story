import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Place/Attraction from OpenTripMap
 */
export interface Place {
  xid: string; // Unique ID
  name: string;
  kinds: string; // Comma-separated categories
  point: {
    lat: number;
    lon: number;
  };
  rate: number; // 1-7 rating (7h = popular, 3 = must see, etc.)
  wikidata?: string;
  osm?: string;
}

export interface PlaceDetails extends Place {
  wikipedia?: string;
  image?: string;
  preview?: {
    source: string;
    width: number;
    height: number;
  };
  wikipedia_extracts?: {
    title: string;
    text: string;
    html: string;
  };
  address?: {
    city?: string;
    road?: string;
    house_number?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  url?: string;
}

/**
 * Categorized place for display
 */
export interface CategorizedPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  description?: string;
  image?: string;
  rating: number; // 1-5 stars
  coordinates: { lat: number; lon: number };
  address?: string;
  wikiUrl?: string;
  kinds: string[];
}

export type PlaceCategory = 
  | 'attraction' 
  | 'restaurant' 
  | 'museum' 
  | 'historic' 
  | 'nature' 
  | 'architecture'
  | 'religious'
  | 'cultural'
  | 'food'
  | 'other';

/**
 * OpenTripMapService - Attractions, restaurants, and POIs
 * 
 * Free tier: 100,000 requests/month
 * Docs: https://opentripmap.io/docs
 */
@Injectable({
  providedIn: 'root'
})
export class OpenTripMapService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.opentripmap.com/0.1/en/places';
  private apiKey = environment.apiKeys.openTripMap;

  // Cache
  private cache = new Map<string, CategorizedPlace[]>();

  /**
   * Get attractions near coordinates
   */
  getAttractions(lat: number, lon: number, radiusMeters: number = 5000, limit: number = 20): Observable<CategorizedPlace[]> {
    const cacheKey = `attractions-${lat}-${lon}-${radiusMeters}`;
    
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    // Categories for tourist attractions
    const kinds = 'interesting_places,tourist_facilities,amusements,architecture,historic,museums';
    
    return this.getPlacesByRadius(lat, lon, radiusMeters, kinds, limit).pipe(
      switchMap(places => this.enrichPlaces(places)),
      map(places => {
        this.cache.set(cacheKey, places);
        return places;
      })
    );
  }

  /**
   * Get restaurants and food places near coordinates
   */
  getRestaurants(lat: number, lon: number, radiusMeters: number = 3000, limit: number = 15): Observable<CategorizedPlace[]> {
    const cacheKey = `restaurants-${lat}-${lon}-${radiusMeters}`;
    
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    const kinds = 'foods,restaurants,cafes,bars,pubs,fast_food,biergartens';
    
    return this.getPlacesByRadius(lat, lon, radiusMeters, kinds, limit).pipe(
      switchMap(places => this.enrichPlaces(places)),
      map(places => {
        this.cache.set(cacheKey, places);
        return places;
      })
    );
  }

  /**
   * Get museums near coordinates
   */
  getMuseums(lat: number, lon: number, radiusMeters: number = 5000, limit: number = 10): Observable<CategorizedPlace[]> {
    const kinds = 'museums,galleries';
    return this.getPlacesByRadius(lat, lon, radiusMeters, kinds, limit).pipe(
      switchMap(places => this.enrichPlaces(places))
    );
  }

  /**
   * Get historic places
   */
  getHistoricPlaces(lat: number, lon: number, radiusMeters: number = 5000, limit: number = 10): Observable<CategorizedPlace[]> {
    const kinds = 'historic,historic_architecture,fortifications,monuments_and_memorials';
    return this.getPlacesByRadius(lat, lon, radiusMeters, kinds, limit).pipe(
      switchMap(places => this.enrichPlaces(places))
    );
  }

  /**
   * Get nature places (parks, gardens, etc.)
   */
  getNaturePlaces(lat: number, lon: number, radiusMeters: number = 10000, limit: number = 10): Observable<CategorizedPlace[]> {
    const kinds = 'natural,gardens_and_parks,nature_reserves,beaches';
    return this.getPlacesByRadius(lat, lon, radiusMeters, kinds, limit).pipe(
      switchMap(places => this.enrichPlaces(places))
    );
  }

  /**
   * Get place details by XID
   */
  getPlaceDetails(xid: string): Observable<PlaceDetails | null> {
    if (!this.apiKey) {
      return of(null);
    }

    const url = `${this.baseUrl}/xid/${xid}`;
    const params = { apikey: this.apiKey };

    return this.http.get<PlaceDetails>(url, { params }).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Search places by name
   */
  searchPlaces(name: string, lat: number, lon: number): Observable<CategorizedPlace[]> {
    if (!this.apiKey || !name) {
      return of([]);
    }

    const url = `${this.baseUrl}/autosuggest`;
    const params = {
      apikey: this.apiKey,
      name,
      lat: lat.toString(),
      lon: lon.toString(),
      radius: '10000',
      limit: '10'
    };

    return this.http.get<{ features: GeoJsonFeature[] }>(url, { params }).pipe(
      map(response => 
        response.features
          .filter(f => f.properties.name)
          .map(f => this.geoJsonToPlace(f))
      ),
      catchError(() => of([]))
    );
  }

  private getPlacesByRadius(
    lat: number, 
    lon: number, 
    radius: number, 
    kinds: string, 
    limit: number
  ): Observable<Place[]> {
    if (!this.apiKey) {
      console.warn('OpenTripMap API key not configured');
      return of([]);
    }

    const url = `${this.baseUrl}/radius`;
    const params = {
      apikey: this.apiKey,
      lat: lat.toString(),
      lon: lon.toString(),
      radius: radius.toString(),
      kinds,
      limit: limit.toString(),
      rate: '2', // Minimum rating (2 = "worth seeing")
      format: 'json'
    };

    return this.http.get<Place[]>(url, { params }).pipe(
      map(places => places.filter(p => p.name && p.name.trim().length > 0)),
      catchError(error => {
        console.error('OpenTripMap API error:', error);
        return of([]);
      })
    );
  }

  private enrichPlaces(places: Place[]): Observable<CategorizedPlace[]> {
    // Convert basic places to categorized places
    // We don't fetch full details for each to save API calls
    return of(places.map(place => this.placeToCategorzied(place)));
  }

  private placeToCategorzied(place: Place): CategorizedPlace {
    return {
      id: place.xid,
      name: place.name,
      category: this.categorizePlace(place.kinds),
      rating: this.convertRating(place.rate),
      coordinates: { lat: place.point.lat, lon: place.point.lon },
      kinds: place.kinds.split(',').map(k => k.trim())
    };
  }

  private geoJsonToPlace(feature: GeoJsonFeature): CategorizedPlace {
    return {
      id: feature.properties.xid,
      name: feature.properties.name,
      category: this.categorizePlace(feature.properties.kinds || ''),
      rating: this.convertRating(feature.properties.rate || 1),
      coordinates: { 
        lat: feature.geometry.coordinates[1], 
        lon: feature.geometry.coordinates[0] 
      },
      kinds: (feature.properties.kinds || '').split(',').map((k: string) => k.trim())
    };
  }

  private categorizePlace(kinds: string): PlaceCategory {
    const kindsLower = kinds.toLowerCase();
    
    if (kindsLower.includes('restaurant') || kindsLower.includes('food') || kindsLower.includes('cafe')) {
      return 'food';
    }
    if (kindsLower.includes('museum') || kindsLower.includes('gallerie')) {
      return 'museum';
    }
    if (kindsLower.includes('historic') || kindsLower.includes('monument') || kindsLower.includes('castle')) {
      return 'historic';
    }
    if (kindsLower.includes('natural') || kindsLower.includes('park') || kindsLower.includes('garden') || kindsLower.includes('beach')) {
      return 'nature';
    }
    if (kindsLower.includes('architecture') || kindsLower.includes('tower') || kindsLower.includes('bridge')) {
      return 'architecture';
    }
    if (kindsLower.includes('religion') || kindsLower.includes('church') || kindsLower.includes('temple') || kindsLower.includes('mosque')) {
      return 'religious';
    }
    if (kindsLower.includes('cultural') || kindsLower.includes('theatre') || kindsLower.includes('opera')) {
      return 'cultural';
    }
    
    return 'attraction';
  }

  private convertRating(rate: number): number {
    // OpenTripMap uses 1-7 scale (7h, 7, 6, 5, 4, 3, 2, 1)
    // Convert to 1-5 stars
    if (rate >= 7) return 5;
    if (rate >= 5) return 4;
    if (rate >= 3) return 3;
    if (rate >= 2) return 2;
    return 1;
  }

  /**
   * Get category icon
   */
  getCategoryIcon(category: PlaceCategory): string {
    const icons: Record<PlaceCategory, string> = {
      'attraction': '🎯',
      'restaurant': '🍽️',
      'museum': '🏛️',
      'historic': '🏰',
      'nature': '🌳',
      'architecture': '🏗️',
      'religious': '⛪',
      'cultural': '🎭',
      'food': '🍴',
      'other': '📍'
    };
    return icons[category] || '📍';
  }

  /**
   * Get category label in Italian
   */
  getCategoryLabel(category: PlaceCategory): string {
    const labels: Record<PlaceCategory, string> = {
      'attraction': 'Attrazione',
      'restaurant': 'Ristorante',
      'museum': 'Museo',
      'historic': 'Luogo Storico',
      'nature': 'Natura',
      'architecture': 'Architettura',
      'religious': 'Luogo Religioso',
      'cultural': 'Cultura',
      'food': 'Cibo',
      'other': 'Altro'
    };
    return labels[category] || 'Altro';
  }
}

// GeoJSON types for autosuggest response
interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    xid: string;
    name: string;
    kinds?: string;
    rate?: number;
  };
}

