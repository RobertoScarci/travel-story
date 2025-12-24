import { Injectable, signal } from '@angular/core';
import { City, CityDetails, CitySection, SectionItem, ViralContent, FlightDeal } from '../models/city.model';

/**
 * CityService - Data provider for city information
 * 
 * Backend-ready: Currently uses mock data
 * Future: Replace methods with HTTP calls to REST API
 * 
 * All data structures mirror expected API responses for seamless transition.
 */
@Injectable({
  providedIn: 'root'
})
export class CityService {
  private citiesSignal = signal<City[]>([]);
  readonly cities = this.citiesSignal.asReadonly();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Get all cities for listing/exploration
   */
  getAllCities(): City[] {
    return this.citiesSignal();
  }

  /**
   * Get city by ID
   */
  getCityById(id: string): City | undefined {
    return this.citiesSignal().find(city => city.id === id);
  }

  /**
   * Get full city details including sections
   * In production, this would be a separate API call
   */
  getCityDetails(id: string): CityDetails | undefined {
    const city = this.getCityById(id);
    if (!city) return undefined;

    return {
      ...city,
      story: this.getCityStory(id),
      sections: this.getCitySections(id),
      practicalInfo: this.getPracticalInfo(id),
      safety: this.getSafetyInfo(id),
      viralContent: this.getViralContent(id),
      flightDeals: this.getFlightDeals(id)
    };
  }

  /**
   * Search cities by query
   */
  searchCities(query: string): City[] {
    const lowercaseQuery = query.toLowerCase();
    return this.citiesSignal().filter(city =>
      city.name.toLowerCase().includes(lowercaseQuery) ||
      city.country.toLowerCase().includes(lowercaseQuery) ||
      city.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get trending/popular cities
   */
  getTrendingCities(limit: number = 6): City[] {
    return [...this.citiesSignal()]
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
  }

  /**
   * Get emerging destinations (hidden gems)
   */
  getEmergingDestinations(limit: number = 4): City[] {
    return [...this.citiesSignal()]
      .filter(city => city.popularityScore < 70 && city.rating >= 4.2)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  /**
   * Get cities by continent
   */
  getCitiesByContinent(continent: string): City[] {
    return this.citiesSignal().filter(city => city.continent === continent);
  }

  /**
   * Get cities by tag
   */
  getCitiesByTag(tag: string): City[] {
    return this.citiesSignal().filter(city => city.tags.includes(tag));
  }

  /**
   * Get budget-friendly cities
   */
  getBudgetFriendlyCities(limit: number = 4): City[] {
    return [...this.citiesSignal()]
      .filter(city => city.priceLevel <= 2)
      .sort((a, b) => a.priceLevel - b.priceLevel || b.rating - a.rating)
      .slice(0, limit);
  }

  // ===== MOCK DATA GENERATORS =====
  // These methods would be replaced by API calls in production

  private getCityStory(cityId: string): CityDetails['story'] {
    const stories: Record<string, CityDetails['story']> = {
      'tokyo': {
        intro: 'Una metropoli dove il futuro incontra la tradizione millenaria. Tokyo non si visita, si vive.',
        atmosphere: 'Neon sfavillanti, templi silenziosi, izakaya nascosti e grattacieli che toccano le nuvole.',
        uniqueAspect: 'L\'ordine perfetto nel caos apparente, dove ogni dettaglio è curato con precisione maniacale.',
        travellerTypes: ['Explorer urbani', 'Amanti della cultura', 'Foodie', 'Tech enthusiast']
      },
      'lisbon': {
        intro: 'Sette colli affacciati sull\'Atlantico, dove la malinconia del fado si mescola alla vitalità moderna.',
        atmosphere: 'Azulejos che raccontano storie, tram gialli che arrancano, pastéis de nata appena sfornati.',
        uniqueAspect: 'La "saudade" portoghese: un sentimento unico che permea ogni angolo della città.',
        travellerTypes: ['Romantici', 'Amanti del cibo', 'Fotografi', 'Budget traveller']
      },
      'marrakech': {
        intro: 'Un caleidoscopio di colori, profumi e suoni che risveglia tutti i sensi.',
        atmosphere: 'Spezie nei souk, chiamate alla preghiera, giardini segreti dietro mura ocra.',
        uniqueAspect: 'La capacità di trasportarti in un\'altra epoca, dove il tempo scorre diversamente.',
        travellerTypes: ['Avventurieri', 'Amanti dell\'artigianato', 'Fotografi', 'Cercatori di esperienze']
      }
    };

    return stories[cityId] || {
      intro: 'Una città tutta da scoprire, con i suoi segreti e le sue meraviglie.',
      atmosphere: 'Un mix unico di cultura, storia e modernità.',
      uniqueAspect: 'Ogni angolo nasconde una sorpresa.',
      travellerTypes: ['Tutti i viaggiatori']
    };
  }

  private getCitySections(cityId: string): CitySection[] {
    // Generate sections based on city - simplified for demo
    return [
      {
        id: 'see',
        type: 'see',
        title: 'Cosa Vedere',
        icon: '👁️',
        items: this.generateSeeItems(cityId)
      },
      {
        id: 'eat',
        type: 'eat',
        title: 'Dove Mangiare',
        icon: '🍽️',
        items: this.generateEatItems(cityId)
      },
      {
        id: 'history',
        type: 'history',
        title: 'Storia e Curiosità',
        icon: '📜',
        items: this.generateHistoryItems(cityId)
      },
      {
        id: 'practical',
        type: 'practical',
        title: 'Info Pratiche',
        icon: '📋',
        items: this.generatePracticalItems(cityId)
      },
      {
        id: 'iconic',
        type: 'iconic',
        title: 'Luoghi Iconici',
        icon: '🏛️',
        items: this.generateIconicItems(cityId)
      }
    ];
  }

  private generateSeeItems(cityId: string): SectionItem[] {
    const items: Record<string, SectionItem[]> = {
      'tokyo': [
        { id: '1', title: 'Tempio Senso-ji', description: 'Il tempio più antico di Tokyo, un\'oasi di spiritualità nel cuore di Asakusa.', image: 'sensoji.jpg', duration: '2-3 ore' },
        { id: '2', title: 'Shibuya Crossing', description: 'L\'incrocio più trafficato del mondo, simbolo della Tokyo moderna.', image: 'shibuya.jpg', duration: '30 min' },
        { id: '3', title: 'Meiji Shrine', description: 'Un santuario shintoista immerso in una foresta nel cuore della città.', image: 'meiji.jpg', duration: '1-2 ore' },
        { id: '4', title: 'TeamLab Borderless', description: 'Un museo digitale immersivo che sfida i confini dell\'arte.', image: 'teamlab.jpg', duration: '3-4 ore', priceRange: '€€' }
      ],
      'lisbon': [
        { id: '1', title: 'Torre di Belém', description: 'Simbolo dell\'era delle scoperte portoghesi.', image: 'belem.jpg', duration: '1 ora' },
        { id: '2', title: 'Alfama', description: 'Il quartiere più antico, un labirinto di vicoli e fado.', image: 'alfama.jpg', duration: '3-4 ore' },
        { id: '3', title: 'Miradouro da Senhora do Monte', description: 'Il più bel punto panoramico della città.', image: 'miradouro.jpg', duration: '1 ora' }
      ]
    };
    return items[cityId] || [
      { id: '1', title: 'Centro Storico', description: 'Il cuore pulsante della città.', duration: '2-3 ore' },
      { id: '2', title: 'Museo Principale', description: 'Collezioni che raccontano la storia locale.', duration: '2 ore' }
    ];
  }

  private generateEatItems(cityId: string): SectionItem[] {
    const items: Record<string, SectionItem[]> = {
      'tokyo': [
        { id: 'e1', title: 'Ramen a Shinjuku', description: 'Omoide Yokocho: vicoli fumosi pieni di izakaya autentici.', priceRange: '€', location: 'Shinjuku' },
        { id: 'e2', title: 'Sushi al Tsukiji Outer Market', description: 'Il pesce più fresco del mondo, servito all\'alba.', priceRange: '€€', location: 'Tsukiji' },
        { id: 'e3', title: 'Kaiseki a Ginza', description: 'Alta cucina giapponese: un\'esperienza multisensoriale.', priceRange: '€€€€', location: 'Ginza' }
      ],
      'lisbon': [
        { id: 'e1', title: 'Pastéis de Belém', description: 'L\'originale pastel de nata, dal 1837.', priceRange: '€', location: 'Belém' },
        { id: 'e2', title: 'Time Out Market', description: 'Il meglio della gastronomia portoghese sotto un unico tetto.', priceRange: '€€', location: 'Cais do Sodré' }
      ]
    };
    return items[cityId] || [
      { id: 'e1', title: 'Cucina Locale', description: 'Sapori autentici del territorio.', priceRange: '€€' }
    ];
  }

  private generateHistoryItems(cityId: string): SectionItem[] {
    return [
      { id: 'h1', title: 'Origini', description: 'Le radici antiche di questa città affascinante.' },
      { id: 'h2', title: 'Curiosità', description: 'Fatti sorprendenti che non troverai sulle guide.' }
    ];
  }

  private generatePracticalItems(cityId: string): SectionItem[] {
    return [
      { id: 'p1', title: 'Come Muoversi', description: 'Trasporti pubblici, taxi e alternative.' },
      { id: 'p2', title: 'Documenti Necessari', description: 'Tutto quello che serve per entrare.' }
    ];
  }

  private generateIconicItems(cityId: string): SectionItem[] {
    return [
      { id: 'i1', title: 'Il Simbolo della Città', description: 'Il luogo che rappresenta l\'anima del posto.' }
    ];
  }

  private getPracticalInfo(cityId: string): CityDetails['practicalInfo'] {
    const info: Record<string, CityDetails['practicalInfo']> = {
      'tokyo': {
        documents: 'Passaporto valido. Visto non richiesto per soggiorni fino a 90 giorni per cittadini UE.',
        bestTimeToVisit: 'Primavera (marzo-maggio) per i ciliegi, Autunno (settembre-novembre) per il foliage.',
        averageCosts: { meal: '€10-30', transport: '€5-15/giorno', accommodation: '€60-150/notte' },
        gettingAround: ['Metro efficientissima', 'JR Pass per spostamenti', 'Suica card consigliata'],
        tipsFromLocals: ['Non parlare al telefono sui mezzi', 'Porta sempre contanti', 'Inchino leggero per salutare']
      },
      'lisbon': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Primavera e autunno per clima mite e meno turisti.',
        averageCosts: { meal: '€8-20', transport: '€3-6/giorno', accommodation: '€40-100/notte' },
        gettingAround: ['Tram 28 iconico', 'Metro moderna', 'Molto camminabile'],
        tipsFromLocals: ['I ristoranti turistici hanno pesce surgelato', 'I locali cenano dopo le 21', 'Porta scarpe comode per le salite']
      }
    };
    return info[cityId] || {
      documents: 'Verifica i requisiti di ingresso sul sito del Ministero degli Esteri.',
      bestTimeToVisit: 'Dipende dalle tue preferenze climatiche.',
      averageCosts: { meal: '€15-25', transport: '€5-10/giorno', accommodation: '€50-120/notte' },
      gettingAround: ['Trasporto pubblico', 'Taxi/Uber'],
      tipsFromLocals: ['Esplora i quartieri meno turistici', 'Chiedi consigli ai locali']
    };
  }

  private getSafetyInfo(cityId: string): CityDetails['safety'] {
    return {
      overallLevel: 'safe',
      currentAlerts: [],
      healthTips: ['Acqua potabile dal rubinetto', 'Assicurazione viaggi consigliata'],
      scamsToAvoid: ['Taxi non ufficiali', 'Cambio valuta in strada'],
      emergencyContacts: { police: '112', medical: '118' }
    };
  }

  private getViralContent(cityId: string): ViralContent[] {
    return [
      {
        id: 'v1',
        platform: 'tiktok',
        title: 'Hidden gems che devi vedere! 🔥',
        thumbnail: 'viral1.jpg',
        externalUrl: 'https://tiktok.com',
        creator: '@travelcreator',
        views: '2.4M'
      },
      {
        id: 'v2',
        platform: 'instagram',
        title: 'I posti più instagrammabili',
        thumbnail: 'viral2.jpg',
        externalUrl: 'https://instagram.com',
        creator: '@wanderlust',
        views: '890K'
      }
    ];
  }

  private getFlightDeals(cityId: string): FlightDeal[] {
    return [
      {
        id: 'f1',
        provider: 'Skyscanner',
        price: 89,
        currency: 'EUR',
        departureCity: 'Milano',
        dates: 'Feb 2025',
        redirectUrl: 'https://skyscanner.com'
      },
      {
        id: 'f2',
        provider: 'Ryanair',
        price: 49,
        currency: 'EUR',
        departureCity: 'Roma',
        dates: 'Mar 2025',
        redirectUrl: 'https://ryanair.com'
      }
    ];
  }

  /**
   * Initialize mock cities data
   */
  private initializeMockData(): void {
    const cities: City[] = [
      {
        id: 'tokyo',
        name: 'Tokyo',
        country: 'Giappone',
        continent: 'Asia',
        tagline: 'Dove tradizione e futuro danzano insieme',
        heroImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
        coordinates: { lat: 35.6762, lng: 139.6503 },
        tags: ['cultural', 'foodie', 'technology', 'nightlife', 'adventure'],
        rating: 4.8,
        popularityScore: 95,
        priceLevel: 4,
        bestPeriod: ['Marzo', 'Aprile', 'Ottobre', 'Novembre'],
        suggestedDays: { min: 5, max: 10 },
        timezone: 'GMT+9',
        language: ['Giapponese'],
        currency: 'JPY (Yen)',
        emergencyNumber: '110'
      },
      {
        id: 'lisbon',
        name: 'Lisbona',
        country: 'Portogallo',
        continent: 'Europa',
        tagline: 'Sette colli di poesia affacciati sull\'oceano',
        heroImage: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800',
        coordinates: { lat: 38.7223, lng: -9.1393 },
        tags: ['romantic', 'foodie', 'budget', 'cultural', 'nightlife'],
        rating: 4.6,
        popularityScore: 88,
        priceLevel: 2,
        bestPeriod: ['Aprile', 'Maggio', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT+0',
        language: ['Portoghese'],
        currency: 'EUR',
        emergencyNumber: '112'
      },
      {
        id: 'marrakech',
        name: 'Marrakech',
        country: 'Marocco',
        continent: 'Africa',
        tagline: 'Un viaggio per i sensi nella città rossa',
        heroImage: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800',
        coordinates: { lat: 31.6295, lng: -7.9811 },
        tags: ['adventure', 'cultural', 'budget', 'foodie', 'exotic'],
        rating: 4.4,
        popularityScore: 82,
        priceLevel: 2,
        bestPeriod: ['Marzo', 'Aprile', 'Ottobre', 'Novembre'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT+1',
        language: ['Arabo', 'Francese'],
        currency: 'MAD (Dirham)',
        emergencyNumber: '19'
      },
      {
        id: 'newyork',
        name: 'New York',
        country: 'Stati Uniti',
        continent: 'Nord America',
        tagline: 'La città che non dorme mai, in ogni senso',
        heroImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        tags: ['cultural', 'nightlife', 'foodie', 'luxury', 'adventure'],
        rating: 4.7,
        popularityScore: 98,
        priceLevel: 5,
        bestPeriod: ['Aprile', 'Maggio', 'Settembre', 'Ottobre', 'Dicembre'],
        suggestedDays: { min: 5, max: 7 },
        timezone: 'GMT-5',
        language: ['Inglese'],
        currency: 'USD',
        emergencyNumber: '911'
      },
      {
        id: 'bali',
        name: 'Bali',
        country: 'Indonesia',
        continent: 'Asia',
        tagline: 'L\'isola degli dei e della pace interiore',
        heroImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
        coordinates: { lat: -8.3405, lng: 115.0920 },
        tags: ['relaxation', 'nature', 'spiritual', 'budget', 'romantic'],
        rating: 4.5,
        popularityScore: 90,
        priceLevel: 2,
        bestPeriod: ['Aprile', 'Maggio', 'Giugno', 'Settembre'],
        suggestedDays: { min: 7, max: 14 },
        timezone: 'GMT+8',
        language: ['Indonesiano', 'Balinese'],
        currency: 'IDR (Rupiah)',
        emergencyNumber: '112'
      },
      {
        id: 'barcelona',
        name: 'Barcellona',
        country: 'Spagna',
        continent: 'Europa',
        tagline: 'Arte, mare e vita notturna mediterranea',
        heroImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800',
        coordinates: { lat: 41.3851, lng: 2.1734 },
        tags: ['cultural', 'nightlife', 'foodie', 'beach', 'architecture'],
        rating: 4.6,
        popularityScore: 92,
        priceLevel: 3,
        bestPeriod: ['Maggio', 'Giugno', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 4, max: 6 },
        timezone: 'GMT+1',
        language: ['Spagnolo', 'Catalano'],
        currency: 'EUR',
        emergencyNumber: '112'
      },
      {
        id: 'reykjavik',
        name: 'Reykjavik',
        country: 'Islanda',
        continent: 'Europa',
        tagline: 'Dove la natura scrive le regole',
        heroImage: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800',
        coordinates: { lat: 64.1466, lng: -21.9426 },
        tags: ['nature', 'adventure', 'unique', 'photography'],
        rating: 4.7,
        popularityScore: 75,
        priceLevel: 5,
        bestPeriod: ['Giugno', 'Luglio', 'Agosto', 'Settembre'],
        suggestedDays: { min: 5, max: 10 },
        timezone: 'GMT+0',
        language: ['Islandese', 'Inglese'],
        currency: 'ISK (Corona)',
        emergencyNumber: '112'
      },
      {
        id: 'capetown',
        name: 'Città del Capo',
        country: 'Sudafrica',
        continent: 'Africa',
        tagline: 'Dove due oceani si incontrano sotto la Table Mountain',
        heroImage: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800',
        coordinates: { lat: -33.9249, lng: 18.4241 },
        tags: ['nature', 'adventure', 'wine', 'beach', 'wildlife'],
        rating: 4.6,
        popularityScore: 78,
        priceLevel: 3,
        bestPeriod: ['Novembre', 'Dicembre', 'Gennaio', 'Febbraio', 'Marzo'],
        suggestedDays: { min: 5, max: 10 },
        timezone: 'GMT+2',
        language: ['Inglese', 'Afrikaans'],
        currency: 'ZAR (Rand)',
        emergencyNumber: '10111'
      }
    ];

    this.citiesSignal.set(cities);
  }
}

