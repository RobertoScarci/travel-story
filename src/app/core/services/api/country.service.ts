import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Country information from RestCountries API
 */
export interface CountryInfo {
  name: string;
  officialName: string;
  capital: string[];
  region: string;
  subregion: string;
  population: number;
  area: number;
  languages: Record<string, string>;
  currencies: CurrencyInfo[];
  timezones: string[];
  flag: string; // Emoji flag
  flagSvg: string;
  flagPng: string;
  coatOfArms?: string;
  maps: {
    googleMaps: string;
    openStreetMaps: string;
  };
  borders: string[];
  drivingSide: 'left' | 'right';
  callingCode: string;
  tld: string[]; // Top level domains
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

/**
 * CountryService - Country data from RestCountries API
 * 
 * Free API, no key required!
 * Docs: https://restcountries.com/
 */
@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private http = inject(HttpClient);
  private baseUrl = environment.apis.restCountries;

  // Cache for country data
  private cache = new Map<string, CountryInfo>();

  /**
   * Get country info by name
   */
  getCountryByName(name: string): Observable<CountryInfo | null> {
    const normalizedName = this.normalizeCountryName(name);
    
    // Check cache first
    if (this.cache.has(normalizedName)) {
      return of(this.cache.get(normalizedName)!);
    }

    const url = `${this.baseUrl}/name/${encodeURIComponent(normalizedName)}`;
    
    return this.http.get<RestCountriesResponse[]>(url).pipe(
      map(response => {
        if (response && response.length > 0) {
          const countryInfo = this.mapCountryInfo(response[0]);
          this.cache.set(normalizedName, countryInfo);
          return countryInfo;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Get country info by country code (ISO 3166-1 alpha-2 or alpha-3)
   */
  getCountryByCode(code: string): Observable<CountryInfo | null> {
    if (this.cache.has(code.toUpperCase())) {
      return of(this.cache.get(code.toUpperCase())!);
    }

    const url = `${this.baseUrl}/alpha/${code}`;
    
    return this.http.get<RestCountriesResponse[]>(url).pipe(
      map(response => {
        if (response && response.length > 0) {
          const countryInfo = this.mapCountryInfo(response[0]);
          this.cache.set(code.toUpperCase(), countryInfo);
          return countryInfo;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Get all countries in a region
   */
  getCountriesByRegion(region: string): Observable<CountryInfo[]> {
    const url = `${this.baseUrl}/region/${encodeURIComponent(region)}`;
    
    return this.http.get<RestCountriesResponse[]>(url).pipe(
      map(response => response.map(c => this.mapCountryInfo(c))),
      catchError(() => of([]))
    );
  }

  /**
   * Get neighboring countries
   */
  getNeighboringCountries(countryCodes: string[]): Observable<CountryInfo[]> {
    if (countryCodes.length === 0) return of([]);
    
    const codes = countryCodes.join(',');
    const url = `${this.baseUrl}/alpha?codes=${codes}`;
    
    return this.http.get<RestCountriesResponse[]>(url).pipe(
      map(response => response.map(c => this.mapCountryInfo(c))),
      catchError(() => of([]))
    );
  }

  /**
   * Format population with locale
   */
  formatPopulation(population: number): string {
    if (population >= 1_000_000_000) {
      return `${(population / 1_000_000_000).toFixed(1)} miliardi`;
    }
    if (population >= 1_000_000) {
      return `${(population / 1_000_000).toFixed(1)} milioni`;
    }
    if (population >= 1_000) {
      return `${(population / 1_000).toFixed(0)} mila`;
    }
    return population.toString();
  }

  /**
   * Format area with locale
   */
  formatArea(area: number): string {
    return `${area.toLocaleString('it-IT')} km²`;
  }

  private mapCountryInfo(response: RestCountriesResponse): CountryInfo {
    const currencies: CurrencyInfo[] = [];
    if (response.currencies) {
      for (const [code, info] of Object.entries(response.currencies)) {
        currencies.push({
          code,
          name: info.name,
          symbol: info.symbol || code
        });
      }
    }

    return {
      name: response.name.common,
      officialName: response.name.official,
      capital: response.capital || [],
      region: response.region,
      subregion: response.subregion || '',
      population: response.population,
      area: response.area || 0,
      languages: response.languages || {},
      currencies,
      timezones: response.timezones || [],
      flag: response.flag,
      flagSvg: response.flags?.svg || '',
      flagPng: response.flags?.png || '',
      coatOfArms: response.coatOfArms?.svg,
      maps: {
        googleMaps: response.maps?.googleMaps || '',
        openStreetMaps: response.maps?.openStreetMaps || ''
      },
      borders: response.borders || [],
      drivingSide: response.car?.side || 'right',
      callingCode: response.idd?.root ? `${response.idd.root}${response.idd.suffixes?.[0] || ''}` : '',
      tld: response.tld || []
    };
  }

  private normalizeCountryName(name: string): string {
    const mappings: Record<string, string> = {
      'giappone': 'japan',
      'portogallo': 'portugal',
      'marocco': 'morocco',
      'stati uniti': 'united states',
      'indonesia': 'indonesia',
      'spagna': 'spain',
      'islanda': 'iceland',
      'sudafrica': 'south africa',
      'francia': 'france',
      'germania': 'germany',
      'italia': 'italy',
      'regno unito': 'united kingdom',
      'paesi bassi': 'netherlands',
      'olanda': 'netherlands',
      'grecia': 'greece',
      'austria': 'austria',
      'svizzera': 'switzerland',
      'belgio': 'belgium',
      'danimarca': 'denmark',
      'norvegia': 'norway',
      'svezia': 'sweden',
      'finlandia': 'finland',
      'irlanda': 'ireland',
      'polonia': 'poland',
      'repubblica ceca': 'czech republic',
      'ungheria': 'hungary',
      'croazia': 'croatia',
      'thailandia': 'thailand',
      'vietnam': 'vietnam',
      'cina': 'china',
      'corea del sud': 'south korea',
      'australia': 'australia',
      'nuova zelanda': 'new zealand',
      'messico': 'mexico',
      'brasile': 'brazil',
      'argentina': 'argentina',
      'cile': 'chile',
      'perù': 'peru',
      'colombia': 'colombia',
      'egitto': 'egypt',
      'kenya': 'kenya',
      'tanzania': 'tanzania',
      'emirati arabi uniti': 'united arab emirates',
      'turchia': 'turkey',
      'israele': 'israel',
      'giordania': 'jordan',
    };

    const normalized = name.toLowerCase().trim();
    return mappings[normalized] || name;
  }
}

// RestCountries API Response type
interface RestCountriesResponse {
  name: {
    common: string;
    official: string;
  };
  capital?: string[];
  region: string;
  subregion?: string;
  population: number;
  area?: number;
  languages?: Record<string, string>;
  currencies?: Record<string, { name: string; symbol?: string }>;
  timezones?: string[];
  flag: string;
  flags?: {
    svg?: string;
    png?: string;
  };
  coatOfArms?: {
    svg?: string;
  };
  maps?: {
    googleMaps?: string;
    openStreetMaps?: string;
  };
  borders?: string[];
  car?: {
    side?: 'left' | 'right';
  };
  idd?: {
    root?: string;
    suffixes?: string[];
  };
  tld?: string[];
}

