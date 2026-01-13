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
  async populateCityImages(city: City, saveToDatabase: boolean = true): Promise<{ updated: boolean; thumbnailUrl?: string; heroUrl?: string; error?: string }> {
    const needsThumbnail = !this.isValidImageUrl(city.thumbnailImage);
    const needsHero = !this.isValidImageUrl(city.heroImage);

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

    // Fallback finale: immagine generica
    const fallbackImage = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80';
    thumbnailUrl = needsThumbnail ? fallbackImage : thumbnailUrl;
    heroUrl = needsHero ? fallbackImage : heroUrl;
    
    if (saveToDatabase) {
      await this.updateCityImages(city, thumbnailUrl, heroUrl);
    }
    
    return { updated: true, thumbnailUrl: needsThumbnail ? thumbnailUrl : undefined, heroUrl: needsHero ? heroUrl : undefined };
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

