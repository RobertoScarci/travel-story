import { Injectable, inject } from '@angular/core';
import { City } from '../models/city.model';
import { DatabaseService } from './database.service';
import { UnsplashService } from './api/unsplash.service';
import { WikipediaService } from './api/wikipedia.service';
import { CountryService } from './api/country.service';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * CitySeederService
 * 
 * Servizio per popolare automaticamente il database con città arricchite.
 * Usa multiple API per ottenere:
 * - Immagini da Unsplash (garantite per tutte le città)
 * - Informazioni da Wikipedia
 * - Dati paese da RestCountries
 * - Coordinate e altre informazioni
 */
@Injectable({
  providedIn: 'root'
})
export class CitySeederService {
  private databaseService = inject(DatabaseService);
  private unsplashService = inject(UnsplashService);
  private wikipediaService = inject(WikipediaService);
  private countryService = inject(CountryService);

  /**
   * Lista estesa di città popolari da seedare
   * Include città da tutti i continenti
   */
  private readonly citiesToSeed: Array<{
    name: string;
    country: string;
    continent: string;
    lat: number;
    lng: number;
  }> = [
    // Europa
    { name: 'Roma', country: 'Italia', continent: 'Europa', lat: 41.9028, lng: 12.4964 },
    { name: 'Parigi', country: 'Francia', continent: 'Europa', lat: 48.8566, lng: 2.3522 },
    { name: 'Londra', country: 'Regno Unito', continent: 'Europa', lat: 51.5074, lng: -0.1278 },
    { name: 'Barcellona', country: 'Spagna', continent: 'Europa', lat: 41.3851, lng: 2.1734 },
    { name: 'Amsterdam', country: 'Paesi Bassi', continent: 'Europa', lat: 52.3676, lng: 4.9041 },
    { name: 'Berlino', country: 'Germania', continent: 'Europa', lat: 52.5200, lng: 13.4050 },
    { name: 'Vienna', country: 'Austria', continent: 'Europa', lat: 48.2082, lng: 16.3738 },
    { name: 'Praga', country: 'Repubblica Ceca', continent: 'Europa', lat: 50.0755, lng: 14.4378 },
    { name: 'Budapest', country: 'Ungheria', continent: 'Europa', lat: 47.4979, lng: 19.0402 },
    { name: 'Lisbona', country: 'Portogallo', continent: 'Europa', lat: 38.7223, lng: -9.1393 },
    { name: 'Atene', country: 'Grecia', continent: 'Europa', lat: 37.9838, lng: 23.7275 },
    { name: 'Firenze', country: 'Italia', continent: 'Europa', lat: 43.7696, lng: 11.2558 },
    { name: 'Venezia', country: 'Italia', continent: 'Europa', lat: 45.4408, lng: 12.3155 },
    { name: 'Milano', country: 'Italia', continent: 'Europa', lat: 45.4642, lng: 9.1900 },
    { name: 'Edimburgo', country: 'Regno Unito', continent: 'Europa', lat: 55.9533, lng: -3.1883 },
    { name: 'Dublino', country: 'Irlanda', continent: 'Europa', lat: 53.3498, lng: -6.2603 },
    { name: 'Stoccolma', country: 'Svezia', continent: 'Europa', lat: 59.3293, lng: 18.0686 },
    { name: 'Copenaghen', country: 'Danimarca', continent: 'Europa', lat: 55.6761, lng: 12.5683 },
    { name: 'Oslo', country: 'Norvegia', continent: 'Europa', lat: 59.9139, lng: 10.7522 },
    { name: 'Helsinki', country: 'Finlandia', continent: 'Europa', lat: 60.1699, lng: 24.9384 },
    { name: 'Zurigo', country: 'Svizzera', continent: 'Europa', lat: 47.3769, lng: 8.5417 },
    { name: 'Bruxelles', country: 'Belgio', continent: 'Europa', lat: 50.8503, lng: 4.3517 },
    { name: 'Varsavia', country: 'Polonia', continent: 'Europa', lat: 52.2297, lng: 21.0122 },
    { name: 'Cracovia', country: 'Polonia', continent: 'Europa', lat: 50.0647, lng: 19.9450 },
    { name: 'Reykjavik', country: 'Islanda', continent: 'Europa', lat: 64.1466, lng: -21.9426 },
    
    // Asia
    { name: 'Tokyo', country: 'Giappone', continent: 'Asia', lat: 35.6762, lng: 139.6503 },
    { name: 'Seoul', country: 'Corea del Sud', continent: 'Asia', lat: 37.5665, lng: 126.9780 },
    { name: 'Bangkok', country: 'Thailandia', continent: 'Asia', lat: 13.7563, lng: 100.5018 },
    { name: 'Singapore', country: 'Singapore', continent: 'Asia', lat: 1.3521, lng: 103.8198 },
    { name: 'Dubai', country: 'Emirati Arabi Uniti', continent: 'Asia', lat: 25.2048, lng: 55.2708 },
    { name: 'Istanbul', country: 'Turchia', continent: 'Asia', lat: 41.0082, lng: 28.9784 },
    { name: 'Hong Kong', country: 'Cina', continent: 'Asia', lat: 22.3193, lng: 114.1694 },
    { name: 'Pechino', country: 'Cina', continent: 'Asia', lat: 39.9042, lng: 116.4074 },
    { name: 'Shanghai', country: 'Cina', continent: 'Asia', lat: 31.2304, lng: 121.4737 },
    { name: 'Delhi', country: 'India', continent: 'Asia', lat: 28.6139, lng: 77.2090 },
    { name: 'Mumbai', country: 'India', continent: 'Asia', lat: 19.0760, lng: 72.8777 },
    { name: 'Bali', country: 'Indonesia', continent: 'Asia', lat: -8.3405, lng: 115.0920 },
    { name: 'Giacarta', country: 'Indonesia', continent: 'Asia', lat: -6.2088, lng: 106.8456 },
    { name: 'Kuala Lumpur', country: 'Malesia', continent: 'Asia', lat: 3.1390, lng: 101.6869 },
    { name: 'Manila', country: 'Filippine', continent: 'Asia', lat: 14.5995, lng: 120.9842 },
    { name: 'Ho Chi Minh', country: 'Vietnam', continent: 'Asia', lat: 10.8231, lng: 106.6297 },
    { name: 'Hanoi', country: 'Vietnam', continent: 'Asia', lat: 21.0285, lng: 105.8542 },
    { name: 'Taipei', country: 'Taiwan', continent: 'Asia', lat: 25.0330, lng: 121.5654 },
    
    // Africa
    { name: 'Cairo', country: 'Egitto', continent: 'Africa', lat: 30.0444, lng: 31.2357 },
    { name: 'Cape Town', country: 'Sudafrica', continent: 'Africa', lat: -33.9249, lng: 18.4241 },
    { name: 'Marrakech', country: 'Marocco', continent: 'Africa', lat: 31.6295, lng: -7.9811 },
    { name: 'Casablanca', country: 'Marocco', continent: 'Africa', lat: 33.5731, lng: -7.5898 },
    { name: 'Nairobi', country: 'Kenya', continent: 'Africa', lat: -1.2921, lng: 36.8219 },
    { name: 'Lagos', country: 'Nigeria', continent: 'Africa', lat: 6.5244, lng: 3.3792 },
    { name: 'Tunis', country: 'Tunisia', continent: 'Africa', lat: 36.8065, lng: 10.1815 },
    
    // Oceania
    { name: 'Sydney', country: 'Australia', continent: 'Oceania', lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne', country: 'Australia', continent: 'Oceania', lat: -37.8136, lng: 144.9631 },
    { name: 'Auckland', country: 'Nuova Zelanda', continent: 'Oceania', lat: -36.8485, lng: 174.7633 },
    { name: 'Wellington', country: 'Nuova Zelanda', continent: 'Oceania', lat: -41.2865, lng: 174.7762 },
    { name: 'Brisbane', country: 'Australia', continent: 'Oceania', lat: -27.4698, lng: 153.0251 },
    
    // Nord America
    { name: 'New York', country: 'Stati Uniti', continent: 'Nord America', lat: 40.7128, lng: -74.0060 },
    { name: 'Los Angeles', country: 'Stati Uniti', continent: 'Nord America', lat: 34.0522, lng: -118.2437 },
    { name: 'San Francisco', country: 'Stati Uniti', continent: 'Nord America', lat: 37.7749, lng: -122.4194 },
    { name: 'Chicago', country: 'Stati Uniti', continent: 'Nord America', lat: 41.8781, lng: -87.6298 },
    { name: 'Miami', country: 'Stati Uniti', continent: 'Nord America', lat: 25.7617, lng: -80.1918 },
    { name: 'Las Vegas', country: 'Stati Uniti', continent: 'Nord America', lat: 36.1699, lng: -115.1398 },
    { name: 'Toronto', country: 'Canada', continent: 'Nord America', lat: 43.6532, lng: -79.3832 },
    { name: 'Montreal', country: 'Canada', continent: 'Nord America', lat: 45.5017, lng: -73.5673 },
    { name: 'Vancouver', country: 'Canada', continent: 'Nord America', lat: 49.2827, lng: -123.1207 },
    { name: 'Mexico City', country: 'Messico', continent: 'Nord America', lat: 19.4326, lng: -99.1332 },
    { name: 'Cancun', country: 'Messico', continent: 'Nord America', lat: 21.1619, lng: -86.8515 },
    
    // Sud America
    { name: 'Buenos Aires', country: 'Argentina', continent: 'Sud America', lat: -34.6037, lng: -58.3816 },
    { name: 'Rio de Janeiro', country: 'Brasile', continent: 'Sud America', lat: -22.9068, lng: -43.1729 },
    { name: 'San Paolo', country: 'Brasile', continent: 'Sud America', lat: -23.5505, lng: -46.6333 },
    { name: 'Lima', country: 'Perù', continent: 'Sud America', lat: -12.0464, lng: -77.0428 },
    { name: 'Santiago', country: 'Cile', continent: 'Sud America', lat: -33.4489, lng: -70.6693 },
    { name: 'Bogotà', country: 'Colombia', continent: 'Sud America', lat: 4.7110, lng: -74.0721 },
    { name: 'Cartagena', country: 'Colombia', continent: 'Sud America', lat: 10.3910, lng: -75.4794 },
    { name: 'Quito', country: 'Ecuador', continent: 'Sud America', lat: -0.1807, lng: -78.4678 },
    
    // Città aggiuntive popolari
    // Europa aggiuntive
    { name: 'Madrid', country: 'Spagna', continent: 'Europa', lat: 40.4168, lng: -3.7038 },
    { name: 'Valencia', country: 'Spagna', continent: 'Europa', lat: 39.4699, lng: -0.3763 },
    { name: 'Porto', country: 'Portogallo', continent: 'Europa', lat: 41.1579, lng: -8.6291 },
    { name: 'Siviglia', country: 'Spagna', continent: 'Europa', lat: 37.3891, lng: -5.9845 },
    { name: 'Monaco', country: 'Monaco', continent: 'Europa', lat: 43.7384, lng: 7.4246 },
    { name: 'Nizza', country: 'Francia', continent: 'Europa', lat: 43.7102, lng: 7.2620 },
    { name: 'Marsiglia', country: 'Francia', continent: 'Europa', lat: 43.2965, lng: 5.3698 },
    { name: 'Lione', country: 'Francia', continent: 'Europa', lat: 45.7640, lng: 4.8357 },
    { name: 'Bruges', country: 'Belgio', continent: 'Europa', lat: 51.2093, lng: 3.2247 },
    { name: 'Salisburgo', country: 'Austria', continent: 'Europa', lat: 47.8095, lng: 13.0550 },
    { name: 'Lubiana', country: 'Slovenia', continent: 'Europa', lat: 46.0569, lng: 14.5058 },
    { name: 'Zagabria', country: 'Croazia', continent: 'Europa', lat: 45.8150, lng: 15.9819 },
    { name: 'Split', country: 'Croazia', continent: 'Europa', lat: 43.5081, lng: 16.4402 },
    { name: 'Dubrovnik', country: 'Croazia', continent: 'Europa', lat: 42.6507, lng: 18.0944 },
    
    // Asia aggiuntive
    { name: 'Kyoto', country: 'Giappone', continent: 'Asia', lat: 35.0116, lng: 135.7681 },
    { name: 'Osaka', country: 'Giappone', continent: 'Asia', lat: 34.6937, lng: 135.5023 },
    { name: 'Macao', country: 'Cina', continent: 'Asia', lat: 22.1987, lng: 113.5439 },
    { name: 'Phuket', country: 'Thailandia', continent: 'Asia', lat: 7.8804, lng: 98.3923 },
    { name: 'Chiang Mai', country: 'Thailandia', continent: 'Asia', lat: 18.7883, lng: 98.9853 },
    { name: 'Yangon', country: 'Myanmar', continent: 'Asia', lat: 16.8661, lng: 96.1951 },
    { name: 'Kathmandu', country: 'Nepal', continent: 'Asia', lat: 27.7172, lng: 85.3240 },
    { name: 'Colombo', country: 'Sri Lanka', continent: 'Asia', lat: 6.9271, lng: 79.8612 },
    
    // Nord America aggiuntive
    { name: 'Boston', country: 'Stati Uniti', continent: 'Nord America', lat: 42.3601, lng: -71.0589 },
    { name: 'Seattle', country: 'Stati Uniti', continent: 'Nord America', lat: 47.6062, lng: -122.3321 },
    { name: 'New Orleans', country: 'Stati Uniti', continent: 'Nord America', lat: 29.9511, lng: -90.0715 },
    { name: 'Washington', country: 'Stati Uniti', continent: 'Nord America', lat: 38.9072, lng: -77.0369 },
    { name: 'Quebec', country: 'Canada', continent: 'Nord America', lat: 46.8139, lng: -71.2080 },
    
    // Sud America aggiuntive
    { name: 'Cusco', country: 'Perù', continent: 'Sud America', lat: -13.5319, lng: -71.9675 },
    { name: 'Montevideo', country: 'Uruguay', continent: 'Sud America', lat: -34.9011, lng: -56.1645 },
    { name: 'La Paz', country: 'Bolivia', continent: 'Sud America', lat: -16.2902, lng: -68.1341 },
  ];

  /**
   * Seeda tutte le città nel database
   * @param onProgress Callback per il progresso (cityName, current, total)
   */
  async seedAllCities(
    onProgress?: (cityName: string, current: number, total: number) => void
  ): Promise<{ success: number; failed: number; errors: Array<{ city: string; error: string }> }> {
    await this.databaseService.initialize();
    
    let success = 0;
    let failed = 0;
    const errors: Array<{ city: string; error: string }> = [];
    const total = this.citiesToSeed.length;

    for (let i = 0; i < this.citiesToSeed.length; i++) {
      const cityInfo = this.citiesToSeed[i];
      
      try {
        if (onProgress) {
          onProgress(cityInfo.name, i + 1, total);
        }

        const city = await this.enrichCityData(cityInfo);
        
        if (city) {
          await this.databaseService.saveCity(city);
          success++;
        } else {
          failed++;
          errors.push({ city: cityInfo.name, error: 'Failed to enrich city data' });
        }

        // Delay per evitare rate limiting (200ms tra ogni città)
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ city: cityInfo.name, error: errorMessage });
        console.error(`Error seeding ${cityInfo.name}:`, error);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Seeda una singola città
   */
  async seedCity(cityInfo: {
    name: string;
    country: string;
    continent: string;
    lat: number;
    lng: number;
  }): Promise<City | null> {
    await this.databaseService.initialize();
    
    try {
      const city = await this.enrichCityData(cityInfo);
      if (city) {
        await this.databaseService.saveCity(city);
      }
      return city;
    } catch (error) {
      console.error(`Error seeding ${cityInfo.name}:`, error);
      return null;
    }
  }

  /**
   * Arricchisce i dati di una città usando tutte le API disponibili
   */
  private async enrichCityData(cityInfo: {
    name: string;
    country: string;
    continent: string;
    lat: number;
    lng: number;
  }): Promise<City | null> {
    try {
      // 1. Ottieni immagini da Unsplash (GARANTITE - fallback se necessario)
      const images = await this.fetchCityImages(cityInfo.name, cityInfo.country);
      
      // 2. Ottieni informazioni da Wikipedia
      const wikipediaData = await firstValueFrom(
        this.wikipediaService.getCitySummary(cityInfo.name, cityInfo.country).pipe(
          catchError(() => of(null))
        )
      );

      // 3. Ottieni informazioni sul paese
      const countryData = await firstValueFrom(
        this.countryService.getCountryByName(cityInfo.country).pipe(
          catchError(() => of(null))
        )
      );

      // 4. Genera ID univoco
      const id = this.generateCityId(cityInfo.name);

      // 5. Costruisci l'oggetto City completo
      const city: City = {
        id,
        name: cityInfo.name,
        country: cityInfo.country,
        continent: cityInfo.continent,
        tagline: this.generateTagline(cityInfo.name, wikipediaData?.extract),
        heroImage: images.heroImage,
        thumbnailImage: images.thumbnailImage,
        coordinates: {
          lat: cityInfo.lat,
          lng: cityInfo.lng
        },
        tags: this.generateTags(cityInfo.continent, wikipediaData?.extract),
        rating: this.generateRating(cityInfo.name),
        popularityScore: this.generatePopularityScore(cityInfo.name),
        priceLevel: this.generatePriceLevel(cityInfo.continent, cityInfo.country),
        bestPeriod: this.generateBestPeriod(cityInfo.continent),
        suggestedDays: this.generateSuggestedDays(cityInfo.continent),
        timezone: countryData?.timezones?.[0] || 'UTC',
        language: countryData ? Object.values(countryData.languages) : [this.getDefaultLanguage(cityInfo.country)],
        currency: countryData?.currencies?.[0]?.code || this.getDefaultCurrency(cityInfo.country),
        emergencyNumber: this.getEmergencyNumber(cityInfo.country)
      };

      return city;
    } catch (error) {
      console.error(`Error enriching ${cityInfo.name}:`, error);
      return null;
    }
  }

  /**
   * Ottiene immagini per una città da Unsplash
   * Garantisce sempre almeno un'immagine (usa fallback se necessario)
   */
  private async fetchCityImages(cityName: string, country: string): Promise<{
    thumbnailImage: string;
    heroImage: string;
  }> {
    try {
      const query = `${cityName} ${country} city travel`;
      const photos = await firstValueFrom(
        this.unsplashService.searchPhotos(query, 3, 1).pipe(
          catchError(() => of([]))
        )
      );

      if (photos.length > 0) {
        const photo = photos[0];
        return {
          thumbnailImage: `${photo.urls.raw}&w=1200&q=80&fit=crop&auto=format`,
          heroImage: `${photo.urls.raw}&w=1920&q=85&fit=crop&auto=format`
        };
      }
    } catch (error) {
      console.warn(`Could not fetch Unsplash images for ${cityName}:`, error);
    }

    // Fallback: usa un'immagine generica di viaggio
    const fallbackImage = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80';
    return {
      thumbnailImage: fallbackImage,
      heroImage: fallbackImage
    };
  }

  /**
   * Genera un ID univoco per la città
   */
  private generateCityId(name: string): string {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Genera un tagline per la città
   */
  private generateTagline(cityName: string, wikipediaExtract?: string): string {
    if (wikipediaExtract) {
      // Prendi le prime 2-3 frasi e crea un tagline
      const sentences = wikipediaExtract.split(/[.!?]+/).filter(s => s.trim().length > 20);
      if (sentences.length > 0) {
        const firstSentence = sentences[0].trim();
        if (firstSentence.length < 100) {
          return firstSentence;
        }
        return firstSentence.substring(0, 97) + '...';
      }
    }
    return `Scopri ${cityName}, una destinazione unica da esplorare`;
  }

  /**
   * Genera tag per la città basati su continente e descrizione
   */
  private generateTags(continent: string, wikipediaExtract?: string): string[] {
    const tags: string[] = ['cultural'];
    const extractLower = (wikipediaExtract || '').toLowerCase();

    // Tag basati su continente
    if (continent === 'Europa') {
      tags.push('historic', 'architecture');
    } else if (continent === 'Asia') {
      tags.push('foodie', 'modern');
    } else if (continent === 'Oceania') {
      tags.push('nature', 'beach');
    } else if (continent === 'Nord America' || continent === 'Sud America') {
      tags.push('adventure', 'vibrant');
    } else if (continent === 'Africa') {
      tags.push('adventure', 'cultural');
    }

    // Tag basati su descrizione Wikipedia
    if (extractLower.includes('beach') || extractLower.includes('mare') || extractLower.includes('oceano')) {
      tags.push('beach');
    }
    if (extractLower.includes('mountain') || extractLower.includes('montagna')) {
      tags.push('nature');
    }
    if (extractLower.includes('food') || extractLower.includes('cucina') || extractLower.includes('ristorante')) {
      tags.push('foodie');
    }
    if (extractLower.includes('nightlife') || extractLower.includes('vita notturna')) {
      tags.push('nightlife');
    }

    return [...new Set(tags)]; // Rimuovi duplicati
  }

  /**
   * Genera un rating realistico per la città
   */
  private generateRating(cityName: string): number {
    // Città molto popolari hanno rating più alti
    const popularCities = ['parigi', 'roma', 'londra', 'tokyo', 'new york', 'barcellona'];
    const normalizedName = cityName.toLowerCase();
    
    if (popularCities.some(c => normalizedName.includes(c))) {
      return 4.5 + Math.random() * 0.3; // 4.5 - 4.8
    }
    return 4.0 + Math.random() * 0.8; // 4.0 - 4.8
  }

  /**
   * Genera un punteggio di popolarità
   */
  private generatePopularityScore(cityName: string): number {
    const veryPopular = ['parigi', 'roma', 'londra', 'tokyo', 'new york', 'barcellona', 'amsterdam'];
    const popular = ['berlino', 'vienna', 'praga', 'budapest', 'lisbona', 'dubai', 'singapore'];
    const normalizedName = cityName.toLowerCase();

    if (veryPopular.some(c => normalizedName.includes(c))) {
      return 85 + Math.floor(Math.random() * 10); // 85-95
    }
    if (popular.some(c => normalizedName.includes(c))) {
      return 70 + Math.floor(Math.random() * 15); // 70-85
    }
    return 50 + Math.floor(Math.random() * 30); // 50-80
  }

  /**
   * Genera livello di prezzo
   */
  private generatePriceLevel(continent: string, country: string): 1 | 2 | 3 | 4 | 5 {
    const expensiveCountries = ['Svizzera', 'Norvegia', 'Islanda', 'Danimarca', 'Svezia', 'Giappone', 'Singapore'];
    const cheapCountries = ['Thailandia', 'Vietnam', 'India', 'Indonesia', 'Marocco', 'Egitto'];
    
    if (expensiveCountries.includes(country)) {
      return 4 + (Math.random() > 0.5 ? 1 : 0) as 4 | 5;
    }
    if (cheapCountries.includes(country)) {
      return 1 + (Math.random() > 0.5 ? 1 : 0) as 1 | 2;
    }
    if (continent === 'Europa' || continent === 'Nord America') {
      return 3 + (Math.random() > 0.5 ? 1 : 0) as 3 | 4;
    }
    return 2 + Math.floor(Math.random() * 2) as 2 | 3;
  }

  /**
   * Genera periodo migliore per visitare
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
   * Genera giorni suggeriti
   */
  private generateSuggestedDays(continent: string): { min: number; max: number } {
    if (continent === 'Europa') {
      return { min: 3, max: 7 };
    }
    if (continent === 'Asia' || continent === 'Oceania') {
      return { min: 5, max: 14 };
    }
    return { min: 4, max: 10 };
  }

  /**
   * Ottiene lingua di default per paese
   */
  private getDefaultLanguage(country: string): string {
    const languages: Record<string, string> = {
      'Italia': 'Italiano',
      'Francia': 'Francese',
      'Regno Unito': 'Inglese',
      'Spagna': 'Spagnolo',
      'Germania': 'Tedesco',
      'Giappone': 'Giapponese',
      'Cina': 'Cinese',
      'Corea del Sud': 'Coreano',
      'Thailandia': 'Tailandese',
      'Brasile': 'Portoghese',
      'Argentina': 'Spagnolo',
      'Messico': 'Spagnolo',
      'Canada': 'Inglese',
      'Stati Uniti': 'Inglese'
    };

    return languages[country] || 'Inglese';
  }

  /**
   * Ottiene valuta di default per paese
   */
  private getDefaultCurrency(country: string): string {
    const currencies: Record<string, string> = {
      'Italia': 'EUR',
      'Francia': 'EUR',
      'Spagna': 'EUR',
      'Germania': 'EUR',
      'Regno Unito': 'GBP',
      'Giappone': 'JPY',
      'Cina': 'CNY',
      'Corea del Sud': 'KRW',
      'Thailandia': 'THB',
      'Brasile': 'BRL',
      'Argentina': 'ARS',
      'Messico': 'MXN',
      'Canada': 'CAD',
      'Stati Uniti': 'USD',
      'Australia': 'AUD',
      'Nuova Zelanda': 'NZD'
    };

    return currencies[country] || 'USD';
  }

  /**
   * Ottiene numero di emergenza per paese
   */
  private getEmergencyNumber(country: string): string {
    const emergencyNumbers: Record<string, string> = {
      'Italia': '112',
      'Francia': '112',
      'Spagna': '112',
      'Germania': '112',
      'Regno Unito': '999',
      'Stati Uniti': '911',
      'Canada': '911',
      'Giappone': '110',
      'Cina': '110',
      'Australia': '000',
      'Nuova Zelanda': '111'
    };

    return emergencyNumbers[country] || '112';
  }

  /**
   * Ottiene la lista di città da seedare
   */
  getCitiesToSeed(): typeof this.citiesToSeed {
    return [...this.citiesToSeed];
  }
}

