import { Injectable, inject } from '@angular/core';
import { UnsplashService } from './api/unsplash.service';
import { CityService } from './city.service';
import { City } from '../models/city.model';
import { firstValueFrom } from 'rxjs';

/**
 * CityImagePopulatorService
 * 
 * Popola automaticamente le immagini mancanti per le città usando Unsplash API.
 * Utile per:
 * - Riempire thumbnailImage mancanti
 * - Riempire heroImage mancanti
 * - Aggiornare immagini esistenti con versioni più recenti
 */
@Injectable({
  providedIn: 'root'
})
export class CityImagePopulatorService {
  private unsplashService = inject(UnsplashService);
  private cityService = inject(CityService);

  /**
   * Verifica se un'immagine è valida (non è un placeholder o URL vuoto)
   */
  private isValidImageUrl(url: string | undefined): boolean {
    if (!url) return false;
    // Controlla se è un placeholder o URL generico
    const placeholderPatterns = [
      'placeholder',
      'default',
      'missing',
      'no-image',
      'empty'
    ];
    return !placeholderPatterns.some(pattern => url.toLowerCase().includes(pattern));
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
   * Popola le immagini mancanti per una singola città
   */
  async populateCityImages(city: City): Promise<{ updated: boolean; thumbnailUrl?: string; heroUrl?: string; error?: string }> {
    const needsThumbnail = !this.isValidImageUrl(city.thumbnailImage);
    const needsHero = !this.isValidImageUrl(city.heroImage);

    if (!needsThumbnail && !needsHero) {
      return { updated: false };
    }

    try {
      // Cerca foto per la città
      const query = `${city.name} ${city.country} city travel`;
      const photos = await firstValueFrom(
        this.unsplashService.searchPhotos(query, 3, 1)
      );

      if (photos.length === 0) {
        return { updated: false, error: 'No photos found' };
      }

      const bestPhoto = photos[0];
      const thumbnailUrl = this.buildThumbnailUrl(bestPhoto);
      const heroUrl = this.buildHeroUrl(bestPhoto);

      return {
        updated: true,
        thumbnailUrl: needsThumbnail ? thumbnailUrl : undefined,
        heroUrl: needsHero ? heroUrl : undefined
      };
    } catch (error) {
      return {
        updated: false,
        error: error instanceof Error ? error.message : 'Failed to fetch photos'
      };
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

