import { Injectable, inject } from '@angular/core';
import { UnsplashService } from './api/unsplash.service';
import { PexelsService } from './api/pexels.service';
import { SectionItem } from '../models/city.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * CityDetailsImagePopulatorService
 * 
 * Popola automaticamente le immagini mancanti per i SectionItem (monumenti, ristoranti, attrazioni).
 * Usa multi-source fallback: Unsplash -> Pexels -> Wikipedia -> Fallback generico
 */
@Injectable({
  providedIn: 'root'
})
export class CityDetailsImagePopulatorService {
  private unsplashService = inject(UnsplashService);
  private pexelsService = inject(PexelsService);

  // Cache per evitare richieste duplicate
  private imageCache = new Map<string, string>();

  /**
   * Popola le immagini mancanti per una lista di SectionItem
   */
  async populateSectionItemsImages(
    items: SectionItem[], 
    cityName: string, 
    country?: string
  ): Promise<SectionItem[]> {
    const enrichedItems = await Promise.all(
      items.map(item => this.populateItemImage(item, cityName, country))
    );
    return enrichedItems;
  }

  /**
   * Popola l'immagine per un singolo SectionItem
   */
  async populateItemImage(
    item: SectionItem, 
    cityName: string, 
    country?: string
  ): Promise<SectionItem> {
    // Se ha già un'immagine valida, non fare nulla
    if (this.isValidImageUrl(item.image)) {
      return item;
    }

    // Controlla cache
    const cacheKey = `${cityName}-${item.title}`;
    if (this.imageCache.has(cacheKey)) {
      return {
        ...item,
        image: this.imageCache.get(cacheKey)!
      };
    }

    // Cerca immagine usando multi-source
    const imageUrl = await this.searchImageForItem(item, cityName, country);
    
    if (imageUrl) {
      this.imageCache.set(cacheKey, imageUrl);
      return {
        ...item,
        image: imageUrl
      };
    }

    return item;
  }

  /**
   * Cerca immagine per un item usando multi-source
   */
  private async searchImageForItem(
    item: SectionItem,
    cityName: string,
    country?: string
  ): Promise<string | null> {
    // Costruisci query di ricerca
    const query = this.buildSearchQuery(item, cityName, country);

    // Try 1: Unsplash
    try {
      const unsplashPhotos = await firstValueFrom(
        this.unsplashService.searchPhotos(query, 1, 1).pipe(
          catchError(() => of([]))
        )
      );

      if (unsplashPhotos.length > 0) {
        return `${unsplashPhotos[0].urls.raw}&w=800&q=80&fit=crop&auto=format`;
      }
    } catch (error) {
      // Continue to next source
    }

    // Try 2: Pexels
    try {
      const pexelsPhotos = await firstValueFrom(
        this.pexelsService.searchPhotos(query, 1, 1).pipe(
          catchError(() => of([]))
        )
      );

      if (pexelsPhotos.length > 0) {
        return pexelsPhotos[0].src.medium; // 1080px
      }
    } catch (error) {
      // Continue to next source
    }

    // Try 3: Fallback generico basato su città
    const cityQuery = country ? `${cityName} ${country}` : cityName;
    try {
      const fallbackPhotos = await firstValueFrom(
        this.pexelsService.searchPhotos(cityQuery, 1, 1).pipe(
          catchError(() => of([]))
        )
      );

      if (fallbackPhotos.length > 0) {
        return fallbackPhotos[0].src.medium;
      }
    } catch (error) {
      // Final fallback
    }

    return null;
  }

  /**
   * Costruisce query di ricerca ottimizzata per l'item
   */
  private buildSearchQuery(item: SectionItem, cityName: string, country?: string): string {
    // Prova query specifica: "nome item città paese"
    const baseQuery = `${item.title} ${cityName} ${country || ''}`.trim();
    
    // Rimuovi caratteri speciali e normalizza
    return baseQuery
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Verifica se un'immagine è valida
   */
  private isValidImageUrl(url: string | undefined): boolean {
    if (!url || url.trim() === '') return false;
    
    const placeholderPatterns = [
      'placeholder',
      'default',
      'missing',
      'no-image',
      'empty',
      'data:image',
      'via.placeholder.com'
    ];
    
    const urlLower = url.toLowerCase();
    if (placeholderPatterns.some(pattern => urlLower.includes(pattern))) {
      return false;
    }
    
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Popola immagini per tutti gli item di una sezione
   */
  async populateSectionImages(
    items: SectionItem[],
    sectionType: string,
    cityName: string,
    country?: string
  ): Promise<SectionItem[]> {
    // Aggiungi tipo sezione alla query per risultati più pertinenti
    const enrichedItems = await Promise.all(
      items.map(async item => {
        if (this.isValidImageUrl(item.image)) {
          return item;
        }

        // Costruisci query con tipo sezione
        const query = sectionType === 'eat' 
          ? `${item.title} restaurant ${cityName} ${country || ''}`
          : sectionType === 'see'
          ? `${item.title} attraction ${cityName} ${country || ''}`
          : `${item.title} ${cityName} ${country || ''}`;

        const imageUrl = await this.searchImageForItem(item, cityName, country);
        
        return imageUrl ? { ...item, image: imageUrl } : item;
      })
    );

    return enrichedItems;
  }
}

