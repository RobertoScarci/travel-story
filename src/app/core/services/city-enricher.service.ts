import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, forkJoin } from 'rxjs';
import { UnsplashService } from './api/unsplash.service';
import { City } from '../models/city.model';
import { firstValueFrom } from 'rxjs';

/**
 * CityEnricherService
 * 
 * Servizio per arricchire il database con nuove città usando API esterne.
 * 
 * Fonti dati:
 * - GeoNames API (gratuita, richiede registrazione): https://www.geonames.org/export/web-services.html
 * - REST Countries API (gratuita): https://restcountries.com/
 * - Unsplash per le immagini
 * 
 * Nota: Per GeoNames serve una registrazione gratuita e un username.
 * Per ora usiamo una lista predefinita di città popolari.
 */
@Injectable({
  providedIn: 'root'
})
export class CityEnricherService {
  private http = inject(HttpClient);
  private unsplashService = inject(UnsplashService);

  /**
   * Lista di città popolari da aggiungere al database
   * Può essere espansa con dati da API
   */
  private popularCitiesToAdd = [
    { name: 'Tokyo', country: 'Giappone', continent: 'Asia', lat: 35.6762, lng: 139.6503 },
    { name: 'Seoul', country: 'Corea del Sud', continent: 'Asia', lat: 37.5665, lng: 126.9780 },
    { name: 'Bangkok', country: 'Thailandia', continent: 'Asia', lat: 13.7563, lng: 100.5018 },
    { name: 'Singapore', country: 'Singapore', continent: 'Asia', lat: 1.3521, lng: 103.8198 },
    { name: 'Dubai', country: 'Emirati Arabi Uniti', continent: 'Asia', lat: 25.2048, lng: 55.2708 },
    { name: 'Istanbul', country: 'Turchia', continent: 'Asia', lat: 41.0082, lng: 28.9784 },
    { name: 'Cairo', country: 'Egitto', continent: 'Africa', lat: 30.0444, lng: 31.2357 },
    { name: 'Cape Town', country: 'Sudafrica', continent: 'Africa', lat: -33.9249, lng: 18.4241 },
    { name: 'Marrakech', country: 'Marocco', continent: 'Africa', lat: 31.6295, lng: -7.9811 },
    { name: 'Sydney', country: 'Australia', continent: 'Oceania', lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne', country: 'Australia', continent: 'Oceania', lat: -37.8136, lng: 144.9631 },
    { name: 'Auckland', country: 'Nuova Zelanda', continent: 'Oceania', lat: -36.8485, lng: 174.7633 },
    { name: 'Buenos Aires', country: 'Argentina', continent: 'Sud America', lat: -34.6037, lng: -58.3816 },
    { name: 'Rio de Janeiro', country: 'Brasile', continent: 'Sud America', lat: -22.9068, lng: -43.1729 },
    { name: 'Lima', country: 'Perù', continent: 'Sud America', lat: -12.0464, lng: -77.0428 },
    { name: 'Santiago', country: 'Cile', continent: 'Sud America', lat: -33.4489, lng: -70.6693 },
    { name: 'Mexico City', country: 'Messico', continent: 'Nord America', lat: 19.4326, lng: -99.1332 },
    { name: 'Toronto', country: 'Canada', continent: 'Nord America', lat: 43.6532, lng: -79.3832 },
    { name: 'Montreal', country: 'Canada', continent: 'Nord America', lat: 45.5017, lng: -73.5673 },
    { name: 'Praga', country: 'Repubblica Ceca', continent: 'Europa', lat: 50.0755, lng: 14.4378 },
    { name: 'Budapest', country: 'Ungheria', continent: 'Europa', lat: 47.4979, lng: 19.0402 },
    { name: 'Varsavia', country: 'Polonia', continent: 'Europa', lat: 52.2297, lng: 21.0122 },
    { name: 'Stoccolma', country: 'Svezia', continent: 'Europa', lat: 59.3293, lng: 18.0686 },
    { name: 'Copenaghen', country: 'Danimarca', continent: 'Europa', lat: 55.6761, lng: 12.5683 },
    { name: 'Oslo', country: 'Norvegia', continent: 'Europa', lat: 59.9139, lng: 10.7522 },
    { name: 'Helsinki', country: 'Finlandia', continent: 'Europa', lat: 60.1699, lng: 24.9384 },
    { name: 'Dublino', country: 'Irlanda', continent: 'Europa', lat: 53.3498, lng: -6.2603 },
    { name: 'Edimburgo', country: 'Regno Unito', continent: 'Europa', lat: 55.9533, lng: -3.1883 },
    { name: 'Vienna', country: 'Austria', continent: 'Europa', lat: 48.2082, lng: 16.3738 },
    { name: 'Zurigo', country: 'Svizzera', continent: 'Europa', lat: 47.3769, lng: 8.5417 },
  ];

  /**
   * Genera dati base per una nuova città
   */
  async generateCityData(cityInfo: { name: string; country: string; continent: string; lat: number; lng: number }): Promise<Partial<City>> {
    // Cerca immagini da Unsplash
    let thumbnailImage = '';
    let heroImage = '';

    try {
      const query = `${cityInfo.name} ${cityInfo.country} city travel`;
      const photos = await firstValueFrom(
        this.unsplashService.searchPhotos(query, 1, 1)
      );

      if (photos.length > 0) {
        const photo = photos[0];
        thumbnailImage = `${photo.urls.raw}&w=1200&q=80&fit=crop&auto=format`;
        heroImage = `${photo.urls.raw}&w=1920&q=85&fit=crop&auto=format`;
      }
    } catch (error) {
      console.warn(`Could not fetch images for ${cityInfo.name}:`, error);
    }

    // Genera ID dalla città
    const id = cityInfo.name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Dati di default (possono essere arricchiti con API)
    return {
      id,
      name: cityInfo.name,
      country: cityInfo.country,
      continent: cityInfo.continent,
      coordinates: {
        lat: cityInfo.lat,
        lng: cityInfo.lng
      },
      thumbnailImage: thumbnailImage || this.getPlaceholderImage(),
      heroImage: heroImage || this.getPlaceholderImage(),
      tagline: `Scopri ${cityInfo.name}, una destinazione unica`,
      rating: 4.0 + Math.random() * 0.8, // 4.0 - 4.8
      popularityScore: Math.floor(50 + Math.random() * 40), // 50 - 90
      priceLevel: Math.floor(Math.random() * 3) + 2 as 1 | 2 | 3 | 4 | 5, // 2-4
      tags: this.generateTags(cityInfo),
      suggestedDays: {
        min: 3,
        max: 7
      },
      bestPeriod: this.generateBestPeriod(cityInfo.continent),
      language: [this.getDefaultLanguage(cityInfo.country)],
      currency: this.getDefaultCurrency(cityInfo.country),
      timezone: 'UTC', // Dovrebbe essere calcolato dalle coordinate
      emergencyNumber: '112' // Default europeo, dovrebbe essere specifico per paese
    };
  }

  /**
   * Ottiene la lista di città popolari da aggiungere
   */
  getCitiesToAdd(): typeof this.popularCitiesToAdd {
    return [...this.popularCitiesToAdd];
  }

  /**
   * Genera dati completi per tutte le città popolari
   */
  async generateAllCitiesData(): Promise<Partial<City>[]> {
    const results = [];
    
    for (const cityInfo of this.popularCitiesToAdd) {
      try {
        const cityData = await this.generateCityData(cityInfo);
        results.push(cityData);
        // Delay per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error generating data for ${cityInfo.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Genera tag basati su continente e caratteristiche comuni
   */
  private generateTags(cityInfo: { name: string; country: string; continent: string }): string[] {
    const tags: string[] = ['cultural'];
    
    if (cityInfo.continent === 'Europa') {
      tags.push('historic', 'architecture');
    } else if (cityInfo.continent === 'Asia') {
      tags.push('foodie', 'modern');
    } else if (cityInfo.continent === 'Oceania') {
      tags.push('nature', 'beach');
    } else if (cityInfo.continent === 'Nord America' || cityInfo.continent === 'Sud America') {
      tags.push('adventure', 'vibrant');
    } else if (cityInfo.continent === 'Africa') {
      tags.push('adventure', 'cultural');
    }

    return tags;
  }

  /**
   * Genera periodo migliore basato sul continente
   */
  private generateBestPeriod(continent: string): string[] {
    const periods: Record<string, string[]> = {
      'Europa': ['Maggio', 'Giugno', 'Settembre'],
      'Asia': ['Novembre', 'Dicembre', 'Gennaio', 'Febbraio'],
      'Oceania': ['Dicembre', 'Gennaio', 'Febbraio'],
      'Nord America': ['Maggio', 'Giugno', 'Settembre', 'Ottobre'],
      'Sud America': ['Maggio', 'Giugno', 'Settembre', 'Ottobre'],
      'Africa': ['Maggio', 'Giugno', 'Luglio', 'Agosto']
    };

    return periods[continent] || ['Primavera', 'Autunno'];
  }

  /**
   * Ottiene lingua di default per paese
   */
  private getDefaultLanguage(country: string): string {
    const languages: Record<string, string> = {
      'Giappone': 'Giapponese',
      'Corea del Sud': 'Coreano',
      'Thailandia': 'Tailandese',
      'Singapore': 'Inglese',
      'Emirati Arabi Uniti': 'Arabo',
      'Turchia': 'Turco',
      'Egitto': 'Arabo',
      'Sudafrica': 'Inglese',
      'Marocco': 'Arabo',
      'Australia': 'Inglese',
      'Nuova Zelanda': 'Inglese',
      'Argentina': 'Spagnolo',
      'Brasile': 'Portoghese',
      'Perù': 'Spagnolo',
      'Cile': 'Spagnolo',
      'Messico': 'Spagnolo',
      'Canada': 'Inglese',
      'Repubblica Ceca': 'Ceco',
      'Ungheria': 'Ungherese',
      'Polonia': 'Polacco',
      'Svezia': 'Svedese',
      'Danimarca': 'Danese',
      'Norvegia': 'Norvegese',
      'Finlandia': 'Finlandese',
      'Irlanda': 'Inglese',
      'Regno Unito': 'Inglese',
      'Austria': 'Tedesco',
      'Svizzera': 'Tedesco'
    };

    return languages[country] || 'Inglese';
  }

  /**
   * Ottiene valuta di default per paese
   */
  private getDefaultCurrency(country: string): string {
    const currencies: Record<string, string> = {
      'Giappone': 'JPY',
      'Corea del Sud': 'KRW',
      'Thailandia': 'THB',
      'Singapore': 'SGD',
      'Emirati Arabi Uniti': 'AED',
      'Turchia': 'TRY',
      'Egitto': 'EGP',
      'Sudafrica': 'ZAR',
      'Marocco': 'MAD',
      'Australia': 'AUD',
      'Nuova Zelanda': 'NZD',
      'Argentina': 'ARS',
      'Brasile': 'BRL',
      'Perù': 'PEN',
      'Cile': 'CLP',
      'Messico': 'MXN',
      'Canada': 'CAD',
      'Repubblica Ceca': 'CZK',
      'Ungheria': 'HUF',
      'Polonia': 'PLN',
      'Svezia': 'SEK',
      'Danimarca': 'DKK',
      'Norvegia': 'NOK',
      'Finlandia': 'EUR',
      'Irlanda': 'EUR',
      'Regno Unito': 'GBP',
      'Austria': 'EUR',
      'Svizzera': 'CHF'
    };

    return currencies[country] || 'USD';
  }

  /**
   * Placeholder image quando Unsplash non è disponibile
   */
  private getPlaceholderImage(): string {
    return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80';
  }
}

