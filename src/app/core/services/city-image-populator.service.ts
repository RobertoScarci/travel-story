import { Injectable, inject } from '@angular/core';
import { UnsplashService } from './api/unsplash.service';
import { CityService } from './city.service';
import { DatabaseService } from './database.service';
import { City } from '../models/city.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * CityImagePopulatorService
 * 
 * Popola automaticamente le immagini mancanti per le città usando Unsplash API.
 * Utile per:
 * - Riempire thumbnailImage mancanti
 * - Riempire heroImage mancanti
 * - Aggiornare immagini esistenti con versioni più recenti
 * - Salvare automaticamente nel database
 */
@Injectable({
  providedIn: 'root'
})
export class CityImagePopulatorService {
  private unsplashService = inject(UnsplashService);
  private cityService = inject(CityService);
  private databaseService = inject(DatabaseService);

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
   * Popola le immagini mancanti per una singola città e salva nel database
   */
  async populateCityImages(city: City, saveToDatabase: boolean = true): Promise<{ updated: boolean; thumbnailUrl?: string; heroUrl?: string; error?: string }> {
    const needsThumbnail = !this.isValidImageUrl(city.thumbnailImage);
    const needsHero = !this.isValidImageUrl(city.heroImage);

    if (!needsThumbnail && !needsHero) {
      return { updated: false };
    }

    try {
      // Cerca foto per la città
      const query = `${city.name} ${city.country} city travel`;
      const photos = await firstValueFrom(
        this.unsplashService.searchPhotos(query, 3, 1).pipe(
          catchError(() => of([]))
        )
      );

      if (photos.length === 0) {
        // Fallback: usa immagine generica
        const fallbackImage = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80';
        const result = {
          updated: true,
          thumbnailUrl: needsThumbnail ? fallbackImage : city.thumbnailImage,
          heroUrl: needsHero ? fallbackImage : city.heroImage
        };
        
        if (saveToDatabase && result.updated) {
          await this.updateCityImages(city, result.thumbnailUrl || city.thumbnailImage, result.heroUrl || city.heroImage);
        }
        
        return result;
      }

      const bestPhoto = photos[0];
      const thumbnailUrl = needsThumbnail ? this.buildThumbnailUrl(bestPhoto) : city.thumbnailImage;
      const heroUrl = needsHero ? this.buildHeroUrl(bestPhoto) : city.heroImage;

      const result = {
        updated: true,
        thumbnailUrl: needsThumbnail ? thumbnailUrl : undefined,
        heroUrl: needsHero ? heroUrl : undefined
      };
      
      // Salva nel database se richiesto
      if (saveToDatabase && result.updated) {
        await this.updateCityImages(city, thumbnailUrl, heroUrl);
      }
      
      return result;
    } catch (error) {
      return {
        updated: false,
        error: error instanceof Error ? error.message : 'Failed to fetch photos'
      };
    }
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
   * Costruisce URL ottimizzato per thumbnail (1200px)
   */
  private buildThumbnailUrl(photo: any): string {
    return `${photo.urls.raw}&w=1200&q=80&fit=crop&auto=format`;
  }

  /**
   * Costruisce URL ottimizzato per hero image (1920px)
   */
  private buildHeroUrl(photo: any): string {
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
        thumbnailUrl: this.buildThumbnailUrl(bestPhoto),
        heroUrl: this.buildHeroUrl(bestPhoto)
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch photos'
      };
    }
  }
}

