import { Injectable, inject, Injector } from '@angular/core';
import { UnsplashService } from './api/unsplash.service';
import { PexelsService } from './api/pexels.service';
import { WikipediaService } from './api/wikipedia.service';
import { CityService } from './city.service';
import { DatabaseService } from './database.service';
import { City } from '../models/city.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * CityImagePopulatorService
 * 
 * Popola automaticamente le immagini mancanti per le città usando multiple fonti.
 * Strategia multi-source con fallback:
 * 1. Unsplash (50 req/hour) - prima scelta
 * 2. Pexels (200 req/hour) - fallback principale
 * 3. Wikipedia - fallback secondario
 * 4. Immagine generica - fallback finale
 * 
 * Utile per:
 * - Riempire thumbnailImage mancanti
 * - Riempire heroImage mancanti
 * - Salvare automaticamente nel database
 */
@Injectable({
  providedIn: 'root'
})
export class CityImagePopulatorService {
  private injector = inject(Injector);
  private unsplashService = inject(UnsplashService);
  private pexelsService = inject(PexelsService);
  private wikipediaService = inject(WikipediaService);
  private databaseService = inject(DatabaseService);
  
  // Lazy injection to break circular dependency
  private get cityService(): CityService {
    return this.injector.get(CityService);
  }

  /**
   * Verifica se un'immagine è valida (non è un placeholder o URL vuoto)
   */
  private isValidImageUrl(url: string | undefined): boolean {
    if (!url || url.trim() === '') return false;
    
    // Controlla se è un placeholder o URL generico
    const placeholderPatterns = [
      'placeholder',
      'default',
      'missing',
      'no-image',
      'empty',
      'data:image', // base64 placeholder
      'via.placeholder.com'
    ];
    
    const urlLower = url.toLowerCase();
    if (placeholderPatterns.some(pattern => urlLower.includes(pattern))) {
      return false;
    }
    
    // Deve essere un URL valido
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Popola le immagini mancanti per tutte le città
   */
  async populateMissingImages(): Promise<{ cityId: string; updated: boolean; error?: string }[]> {
    const cities = this.cityService.getAllCities();
    const results = [];

    for (const city of cities) {
      try {
        const result = await this.populateCityImages(city);
        results.push({ cityId: city.id, ...result });
      } catch (error) {
        results.push({
          cityId: city.id,
          updated: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Popola le immagini mancanti per una singola città usando multi-source con fallback
   */
  async populateCityImages(city: City, saveToDatabase: boolean = true, forceUpdate: boolean = false): Promise<{ updated: boolean; thumbnailUrl?: string; heroUrl?: string; error?: string }> {
    // Check if image is valid AND not a known duplicate placeholder
    const needsThumbnail = forceUpdate || !this.isValidImageUrl(city.thumbnailImage) || this.isKnownDuplicatePlaceholder(city.thumbnailImage);
    const needsHero = forceUpdate || !this.isValidImageUrl(city.heroImage) || this.isKnownDuplicatePlaceholder(city.heroImage);

    if (!needsThumbnail && !needsHero) {
      return { updated: false };
    }

    const query = `${city.name} ${city.country} city travel`;
    let thumbnailUrl = city.thumbnailImage;
    let heroUrl = city.heroImage;

    // Try 1: Unsplash
    try {
      const unsplashPhotos = await firstValueFrom(
        this.unsplashService.searchPhotos(query, 3, 1).pipe(
          catchError(() => of([]))
        )
      );

      if (unsplashPhotos.length > 0) {
        const photo = unsplashPhotos[0];
        thumbnailUrl = needsThumbnail ? this.buildUnsplashThumbnailUrl(photo) : thumbnailUrl;
        heroUrl = needsHero ? this.buildUnsplashHeroUrl(photo) : heroUrl;
        
        if (saveToDatabase) {
          await this.updateCityImages(city, thumbnailUrl, heroUrl);
        }
        return { updated: true, thumbnailUrl: needsThumbnail ? thumbnailUrl : undefined, heroUrl: needsHero ? heroUrl : undefined };
      }
    } catch (error) {
      console.debug(`Unsplash failed for ${city.name}, trying Pexels...`);
    }

    // Try 2: Pexels (fallback principale - 200 req/hour)
    try {
      const pexelsPhotos = await firstValueFrom(
        this.pexelsService.searchPhotos(query, 3, 1).pipe(
          catchError(() => of([]))
        )
      );

      if (pexelsPhotos.length > 0) {
        const photo = pexelsPhotos[0];
        thumbnailUrl = needsThumbnail ? this.pexelsService.getThumbnailUrl(photo) : thumbnailUrl;
        heroUrl = needsHero ? this.pexelsService.getHeroUrl(photo) : heroUrl;
        
        if (saveToDatabase) {
          await this.updateCityImages(city, thumbnailUrl, heroUrl);
        }
        return { updated: true, thumbnailUrl: needsThumbnail ? thumbnailUrl : undefined, heroUrl: needsHero ? heroUrl : undefined };
      }
    } catch (error) {
      console.debug(`Pexels failed for ${city.name}, trying Wikipedia...`);
    }

    // Try 3: Wikipedia (fallback secondario)
    try {
      const wikiSummary = await firstValueFrom(
        this.wikipediaService.getCitySummary(city.name, city.country).pipe(
          catchError(() => of(null))
        )
      );

      if (wikiSummary?.originalImage?.url) {
        const wikiImage = wikiSummary.originalImage.url;
        thumbnailUrl = needsThumbnail ? wikiImage : thumbnailUrl;
        heroUrl = needsHero ? wikiImage : heroUrl;
        
        if (saveToDatabase) {
          await this.updateCityImages(city, thumbnailUrl, heroUrl);
        }
        return { updated: true, thumbnailUrl: needsThumbnail ? thumbnailUrl : undefined, heroUrl: needsHero ? heroUrl : undefined };
      }
    } catch (error) {
      console.debug(`Wikipedia failed for ${city.name}, using generic fallback...`);
    }

    // Fallback finale: usa placeholder unico basato sul nome della città per evitare duplicati
    // Usa un hash più complesso includendo anche un seed basato sulla posizione nella lista
    const cityHash = this.simpleHash(city.name + city.country + city.id);
    // Espandiamo la lista di placeholder per ridurre collisioni
    const placeholderVariations = [
      '1488646953014-85cb44e25828', // Travel map
      '1506905925346-21bda4d32df4', // Mountains
      '1511920170033-f8396924c348', // Beach
      '1514395462725-fb4566210144', // City skyline
      '1526392060635-9d6019884377', // Architecture
      '1533106497176-45ae19e68ba2', // Culture
      '1543429257-3eb0b65d9c58',    // Historic
      '1559511260-66a68eee9b9f',    // Nature
      '1469474388157-4917a93874a3', // City lights
      '1519681393784-d120267933ba', // Urban landscape
      '1506905925346-21bda4d32df4', // Mountains (different)
      '1493663288411-6ac843ae2b93', // Travel adventure
      '1501785888522-5bde5f763a06', // Mountain city
      '1496564203459-31d85babe0d8', // Cityscape
      '1493809842364-78817add7ffb', // Urban exploration
      '1501594907352-04e1a5d93a6b', // Travel destination
      '1490645935967-10de6ba17061', // Beautiful city
      '1488646953014-85cb44e25828'  // Repeat for more variation
    ];
    const selectedPlaceholder = placeholderVariations[cityHash % placeholderVariations.length];
    // Aggiungi anche un seed unico per ogni città per assicurare unicità
    const uniqueSeed = cityHash % 1000;
    const fallbackImage = `https://images.unsplash.com/photo-${selectedPlaceholder}?w=1200&q=80&sig=${uniqueSeed}`;
    thumbnailUrl = needsThumbnail ? fallbackImage : thumbnailUrl;
    heroUrl = needsHero ? fallbackImage.replace('w=1200', 'w=1920') : heroUrl;
    
    if (saveToDatabase) {
      await this.updateCityImages(city, thumbnailUrl, heroUrl);
    }
    
    return { updated: true, thumbnailUrl: needsThumbnail ? thumbnailUrl : undefined, heroUrl: needsHero ? heroUrl : undefined };
  }

  /**
   * Genera un hash semplice per selezionare placeholder unici
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if an image URL is a known duplicate placeholder
   */
  private isKnownDuplicatePlaceholder(url: string | undefined): boolean {
    if (!url) return false;
    const knownPlaceholders = [
      '1488646953014-85cb44e25828', // Travel map (generic)
      '1544025162-d76694265947'      // Travel items on map (the one we see in the image)
    ];
    return knownPlaceholders.some(id => url.includes(id));
  }

  /**
   * Aggiorna le immagini di una città nel database e nel servizio
   */
  private async updateCityImages(city: City, thumbnailUrl: string, heroUrl: string): Promise<void> {
    const updatedCity: City = {
      ...city,
      thumbnailImage: thumbnailUrl,
      heroImage: heroUrl
    };
    
    // Salva nel database
    await this.databaseService.saveCity(updatedCity);
    
    // Aggiorna nel servizio (se disponibile)
    try {
      const currentCities = this.cityService.getAllCities();
      const cityIndex = currentCities.findIndex(c => c.id === city.id);
      if (cityIndex >= 0) {
        currentCities[cityIndex] = updatedCity;
        // Il signal viene aggiornato dal CityService stesso
      }
    } catch (error) {
      // Ignora errori se il servizio non è ancora inizializzato
    }
  }

  /**
   * Costruisce URL ottimizzato per thumbnail da Unsplash (1200px)
   */
  private buildUnsplashThumbnailUrl(photo: any): string {
    return `${photo.urls.raw}&w=1200&q=80&fit=crop&auto=format`;
  }

  /**
   * Costruisce URL ottimizzato per hero image da Unsplash (1920px)
   */
  private buildUnsplashHeroUrl(photo: any): string {
    return `${photo.urls.raw}&w=1920&q=85&fit=crop&auto=format`;
  }

  /**
   * Aggiorna le immagini per una città specifica (anche se già presenti)
   */
  async refreshCityImages(cityId: string): Promise<{ thumbnailUrl?: string; heroUrl?: string; error?: string }> {
    const city = this.cityService.getCityById(cityId);
    if (!city) {
      return { error: 'City not found' };
    }

    try {
      const query = `${city.name} ${city.country} city travel`;
      const photos = await firstValueFrom(
        this.unsplashService.searchPhotos(query, 3, 1)
      );

      if (photos.length === 0) {
        return { error: 'No photos found' };
      }

      const bestPhoto = photos[0];
      return {
        thumbnailUrl: this.buildUnsplashThumbnailUrl(bestPhoto),
        heroUrl: this.buildUnsplashHeroUrl(bestPhoto)
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch photos'
      };
    }
  }
}

