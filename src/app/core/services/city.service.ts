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
      // ===== ASIA =====
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
        id: 'bangkok',
        name: 'Bangkok',
        country: 'Thailandia',
        continent: 'Asia',
        tagline: 'Caos vibrante tra templi dorati e street food',
        heroImage: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800',
        coordinates: { lat: 13.7563, lng: 100.5018 },
        tags: ['foodie', 'budget', 'nightlife', 'cultural', 'adventure'],
        rating: 4.5,
        popularityScore: 88,
        priceLevel: 1,
        bestPeriod: ['Novembre', 'Dicembre', 'Gennaio', 'Febbraio'],
        suggestedDays: { min: 4, max: 7 },
        timezone: 'GMT+7',
        language: ['Thailandese'],
        currency: 'THB (Baht)',
        emergencyNumber: '191'
      },
      {
        id: 'singapore',
        name: 'Singapore',
        country: 'Singapore',
        continent: 'Asia',
        tagline: 'La città-stato del futuro verde',
        heroImage: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800',
        coordinates: { lat: 1.3521, lng: 103.8198 },
        tags: ['luxury', 'foodie', 'technology', 'cultural', 'family'],
        rating: 4.7,
        popularityScore: 85,
        priceLevel: 4,
        bestPeriod: ['Febbraio', 'Marzo', 'Aprile', 'Ottobre'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT+8',
        language: ['Inglese', 'Mandarino', 'Malese', 'Tamil'],
        currency: 'SGD',
        emergencyNumber: '999'
      },
      {
        id: 'kyoto',
        name: 'Kyoto',
        country: 'Giappone',
        continent: 'Asia',
        tagline: 'L\'anima tradizionale del Giappone',
        heroImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
        coordinates: { lat: 35.0116, lng: 135.7681 },
        tags: ['cultural', 'spiritual', 'romantic', 'photography', 'nature'],
        rating: 4.9,
        popularityScore: 87,
        priceLevel: 3,
        bestPeriod: ['Marzo', 'Aprile', 'Ottobre', 'Novembre'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT+9',
        language: ['Giapponese'],
        currency: 'JPY (Yen)',
        emergencyNumber: '110'
      },
      {
        id: 'seoul',
        name: 'Seoul',
        country: 'Corea del Sud',
        continent: 'Asia',
        tagline: 'K-pop, tecnologia e palazzi imperiali',
        heroImage: 'https://images.unsplash.com/photo-1534274867514-d5b47ef89ed7?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1534274867514-d5b47ef89ed7?w=800',
        coordinates: { lat: 37.5665, lng: 126.9780 },
        tags: ['technology', 'cultural', 'foodie', 'nightlife', 'shopping'],
        rating: 4.6,
        popularityScore: 83,
        priceLevel: 3,
        bestPeriod: ['Aprile', 'Maggio', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 4, max: 6 },
        timezone: 'GMT+9',
        language: ['Coreano'],
        currency: 'KRW (Won)',
        emergencyNumber: '112'
      },
      {
        id: 'hanoi',
        name: 'Hanoi',
        country: 'Vietnam',
        continent: 'Asia',
        tagline: 'Mille anni di storia tra laghi e pagode',
        heroImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
        coordinates: { lat: 21.0278, lng: 105.8342 },
        tags: ['cultural', 'budget', 'foodie', 'adventure', 'historic'],
        rating: 4.4,
        popularityScore: 75,
        priceLevel: 1,
        bestPeriod: ['Ottobre', 'Novembre', 'Marzo', 'Aprile'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT+7',
        language: ['Vietnamita'],
        currency: 'VND (Dong)',
        emergencyNumber: '113'
      },
      {
        id: 'dubai',
        name: 'Dubai',
        country: 'Emirati Arabi Uniti',
        continent: 'Asia',
        tagline: 'Dove l\'impossibile diventa realtà nel deserto',
        heroImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800',
        coordinates: { lat: 25.2048, lng: 55.2708 },
        tags: ['luxury', 'shopping', 'architecture', 'beach', 'family'],
        rating: 4.5,
        popularityScore: 91,
        priceLevel: 5,
        bestPeriod: ['Novembre', 'Dicembre', 'Gennaio', 'Febbraio', 'Marzo'],
        suggestedDays: { min: 4, max: 7 },
        timezone: 'GMT+4',
        language: ['Arabo', 'Inglese'],
        currency: 'AED (Dirham)',
        emergencyNumber: '999'
      },
      // ===== EUROPA =====
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
        id: 'paris',
        name: 'Parigi',
        country: 'Francia',
        continent: 'Europa',
        tagline: 'La ville lumière che ispira il mondo',
        heroImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
        coordinates: { lat: 48.8566, lng: 2.3522 },
        tags: ['romantic', 'cultural', 'foodie', 'luxury', 'architecture'],
        rating: 4.7,
        popularityScore: 97,
        priceLevel: 4,
        bestPeriod: ['Aprile', 'Maggio', 'Giugno', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 4, max: 7 },
        timezone: 'GMT+1',
        language: ['Francese'],
        currency: 'EUR',
        emergencyNumber: '112'
      },
      {
        id: 'rome',
        name: 'Roma',
        country: 'Italia',
        continent: 'Europa',
        tagline: 'La città eterna dove ogni pietra è storia',
        heroImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800',
        coordinates: { lat: 41.9028, lng: 12.4964 },
        tags: ['cultural', 'historic', 'foodie', 'romantic', 'architecture'],
        rating: 4.7,
        popularityScore: 94,
        priceLevel: 3,
        bestPeriod: ['Aprile', 'Maggio', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 4, max: 6 },
        timezone: 'GMT+1',
        language: ['Italiano'],
        currency: 'EUR',
        emergencyNumber: '112'
      },
      {
        id: 'amsterdam',
        name: 'Amsterdam',
        country: 'Paesi Bassi',
        continent: 'Europa',
        tagline: 'Canali, biciclette e libertà creativa',
        heroImage: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800',
        coordinates: { lat: 52.3676, lng: 4.9041 },
        tags: ['cultural', 'nightlife', 'romantic', 'architecture', 'cycling'],
        rating: 4.5,
        popularityScore: 86,
        priceLevel: 4,
        bestPeriod: ['Aprile', 'Maggio', 'Giugno', 'Settembre'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT+1',
        language: ['Olandese', 'Inglese'],
        currency: 'EUR',
        emergencyNumber: '112'
      },
      {
        id: 'prague',
        name: 'Praga',
        country: 'Repubblica Ceca',
        continent: 'Europa',
        tagline: 'La città delle cento torri e della birra',
        heroImage: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
        coordinates: { lat: 50.0755, lng: 14.4378 },
        tags: ['cultural', 'budget', 'romantic', 'nightlife', 'historic'],
        rating: 4.6,
        popularityScore: 84,
        priceLevel: 2,
        bestPeriod: ['Aprile', 'Maggio', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 3, max: 4 },
        timezone: 'GMT+1',
        language: ['Ceco'],
        currency: 'CZK (Corona)',
        emergencyNumber: '112'
      },
      {
        id: 'vienna',
        name: 'Vienna',
        country: 'Austria',
        continent: 'Europa',
        tagline: 'Caffè, valzer e splendore imperiale',
        heroImage: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800',
        coordinates: { lat: 48.2082, lng: 16.3738 },
        tags: ['cultural', 'music', 'architecture', 'foodie', 'romantic'],
        rating: 4.7,
        popularityScore: 82,
        priceLevel: 3,
        bestPeriod: ['Aprile', 'Maggio', 'Settembre', 'Dicembre'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT+1',
        language: ['Tedesco'],
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
        id: 'athens',
        name: 'Atene',
        country: 'Grecia',
        continent: 'Europa',
        tagline: 'Culla della civiltà occidentale',
        heroImage: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=800',
        coordinates: { lat: 37.9838, lng: 23.7275 },
        tags: ['historic', 'cultural', 'budget', 'foodie', 'beach'],
        rating: 4.4,
        popularityScore: 79,
        priceLevel: 2,
        bestPeriod: ['Aprile', 'Maggio', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT+2',
        language: ['Greco'],
        currency: 'EUR',
        emergencyNumber: '112'
      },
      {
        id: 'florence',
        name: 'Firenze',
        country: 'Italia',
        continent: 'Europa',
        tagline: 'Il cuore pulsante del Rinascimento',
        heroImage: 'https://images.unsplash.com/photo-1543429257-3eb0b65d9c58?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1543429257-3eb0b65d9c58?w=800',
        coordinates: { lat: 43.7696, lng: 11.2558 },
        tags: ['cultural', 'architecture', 'foodie', 'romantic', 'art'],
        rating: 4.8,
        popularityScore: 89,
        priceLevel: 3,
        bestPeriod: ['Aprile', 'Maggio', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 3, max: 4 },
        timezone: 'GMT+1',
        language: ['Italiano'],
        currency: 'EUR',
        emergencyNumber: '112'
      },
      {
        id: 'santorini',
        name: 'Santorini',
        country: 'Grecia',
        continent: 'Europa',
        tagline: 'Tramonti infuocati sul bianco e blu',
        heroImage: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800',
        coordinates: { lat: 36.3932, lng: 25.4615 },
        tags: ['romantic', 'beach', 'photography', 'luxury', 'relaxation'],
        rating: 4.8,
        popularityScore: 91,
        priceLevel: 4,
        bestPeriod: ['Maggio', 'Giugno', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT+2',
        language: ['Greco'],
        currency: 'EUR',
        emergencyNumber: '112'
      },
      {
        id: 'dubrovnik',
        name: 'Dubrovnik',
        country: 'Croazia',
        continent: 'Europa',
        tagline: 'La perla dell\'Adriatico tra mura antiche',
        heroImage: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=800',
        coordinates: { lat: 42.6507, lng: 18.0944 },
        tags: ['historic', 'beach', 'romantic', 'cultural', 'photography'],
        rating: 4.6,
        popularityScore: 81,
        priceLevel: 3,
        bestPeriod: ['Maggio', 'Giugno', 'Settembre'],
        suggestedDays: { min: 2, max: 4 },
        timezone: 'GMT+1',
        language: ['Croato'],
        currency: 'EUR',
        emergencyNumber: '112'
      },
      // ===== AFRICA =====
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
      },
      {
        id: 'cairo',
        name: 'Il Cairo',
        country: 'Egitto',
        continent: 'Africa',
        tagline: 'Millenni di storia all\'ombra delle piramidi',
        heroImage: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800',
        coordinates: { lat: 30.0444, lng: 31.2357 },
        tags: ['historic', 'cultural', 'adventure', 'budget', 'exotic'],
        rating: 4.3,
        popularityScore: 76,
        priceLevel: 1,
        bestPeriod: ['Ottobre', 'Novembre', 'Marzo', 'Aprile'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT+2',
        language: ['Arabo'],
        currency: 'EGP (Sterlina)',
        emergencyNumber: '122'
      },
      {
        id: 'zanzibar',
        name: 'Zanzibar',
        country: 'Tanzania',
        continent: 'Africa',
        tagline: 'Spezie, spiagge bianche e storia swahili',
        heroImage: 'https://images.unsplash.com/photo-1586163981567-6ee14bcbd52d?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1586163981567-6ee14bcbd52d?w=800',
        coordinates: { lat: -6.1659, lng: 39.2026 },
        tags: ['beach', 'relaxation', 'exotic', 'romantic', 'adventure'],
        rating: 4.5,
        popularityScore: 72,
        priceLevel: 2,
        bestPeriod: ['Giugno', 'Luglio', 'Agosto', 'Settembre', 'Gennaio', 'Febbraio'],
        suggestedDays: { min: 5, max: 10 },
        timezone: 'GMT+3',
        language: ['Swahili', 'Inglese'],
        currency: 'TZS (Scellino)',
        emergencyNumber: '112'
      },
      // ===== NORD AMERICA =====
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
        id: 'losangeles',
        name: 'Los Angeles',
        country: 'Stati Uniti',
        continent: 'Nord America',
        tagline: 'Sogni sotto il sole californiano',
        heroImage: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800',
        coordinates: { lat: 34.0522, lng: -118.2437 },
        tags: ['beach', 'nightlife', 'cultural', 'luxury', 'entertainment'],
        rating: 4.4,
        popularityScore: 89,
        priceLevel: 4,
        bestPeriod: ['Marzo', 'Aprile', 'Maggio', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 5, max: 7 },
        timezone: 'GMT-8',
        language: ['Inglese'],
        currency: 'USD',
        emergencyNumber: '911'
      },
      {
        id: 'sanfrancisco',
        name: 'San Francisco',
        country: 'Stati Uniti',
        continent: 'Nord America',
        tagline: 'Nebbia, ponti iconici e spirito innovativo',
        heroImage: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
        coordinates: { lat: 37.7749, lng: -122.4194 },
        tags: ['technology', 'cultural', 'foodie', 'nature', 'photography'],
        rating: 4.6,
        popularityScore: 84,
        priceLevel: 5,
        bestPeriod: ['Settembre', 'Ottobre', 'Aprile', 'Maggio'],
        suggestedDays: { min: 4, max: 6 },
        timezone: 'GMT-8',
        language: ['Inglese'],
        currency: 'USD',
        emergencyNumber: '911'
      },
      {
        id: 'miami',
        name: 'Miami',
        country: 'Stati Uniti',
        continent: 'Nord America',
        tagline: 'Art Deco, spiagge e ritmi latini',
        heroImage: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800',
        coordinates: { lat: 25.7617, lng: -80.1918 },
        tags: ['beach', 'nightlife', 'luxury', 'foodie', 'art'],
        rating: 4.4,
        popularityScore: 85,
        priceLevel: 4,
        bestPeriod: ['Dicembre', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile'],
        suggestedDays: { min: 4, max: 6 },
        timezone: 'GMT-5',
        language: ['Inglese', 'Spagnolo'],
        currency: 'USD',
        emergencyNumber: '911'
      },
      {
        id: 'vancouver',
        name: 'Vancouver',
        country: 'Canada',
        continent: 'Nord America',
        tagline: 'Montagne e oceano in perfetta armonia',
        heroImage: 'https://images.unsplash.com/photo-1559511260-66a68eee9b9f?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1559511260-66a68eee9b9f?w=800',
        coordinates: { lat: 49.2827, lng: -123.1207 },
        tags: ['nature', 'adventure', 'foodie', 'cultural', 'skiing'],
        rating: 4.6,
        popularityScore: 77,
        priceLevel: 4,
        bestPeriod: ['Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre'],
        suggestedDays: { min: 4, max: 7 },
        timezone: 'GMT-8',
        language: ['Inglese', 'Francese'],
        currency: 'CAD',
        emergencyNumber: '911'
      },
      {
        id: 'mexicocity',
        name: 'Città del Messico',
        country: 'Messico',
        continent: 'Nord America',
        tagline: 'Arte, storia azteca e tacos incredibili',
        heroImage: 'https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=800',
        coordinates: { lat: 19.4326, lng: -99.1332 },
        tags: ['cultural', 'foodie', 'budget', 'historic', 'art'],
        rating: 4.5,
        popularityScore: 80,
        priceLevel: 2,
        bestPeriod: ['Marzo', 'Aprile', 'Maggio', 'Ottobre', 'Novembre'],
        suggestedDays: { min: 4, max: 7 },
        timezone: 'GMT-6',
        language: ['Spagnolo'],
        currency: 'MXN (Peso)',
        emergencyNumber: '911'
      },
      // ===== SUD AMERICA =====
      {
        id: 'buenosaires',
        name: 'Buenos Aires',
        country: 'Argentina',
        continent: 'Sud America',
        tagline: 'Tango, carne e passione sudamericana',
        heroImage: 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=800',
        coordinates: { lat: -34.6037, lng: -58.3816 },
        tags: ['cultural', 'foodie', 'nightlife', 'romantic', 'budget'],
        rating: 4.5,
        popularityScore: 79,
        priceLevel: 2,
        bestPeriod: ['Marzo', 'Aprile', 'Maggio', 'Settembre', 'Ottobre', 'Novembre'],
        suggestedDays: { min: 4, max: 7 },
        timezone: 'GMT-3',
        language: ['Spagnolo'],
        currency: 'ARS (Peso)',
        emergencyNumber: '911'
      },
      {
        id: 'riodejaneiro',
        name: 'Rio de Janeiro',
        country: 'Brasile',
        continent: 'Sud America',
        tagline: 'Samba, spiagge e il Cristo che abbraccia tutto',
        heroImage: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800',
        coordinates: { lat: -22.9068, lng: -43.1729 },
        tags: ['beach', 'nightlife', 'cultural', 'adventure', 'photography'],
        rating: 4.5,
        popularityScore: 86,
        priceLevel: 2,
        bestPeriod: ['Dicembre', 'Gennaio', 'Febbraio', 'Marzo'],
        suggestedDays: { min: 5, max: 8 },
        timezone: 'GMT-3',
        language: ['Portoghese'],
        currency: 'BRL (Real)',
        emergencyNumber: '190'
      },
      {
        id: 'cusco',
        name: 'Cusco',
        country: 'Perù',
        continent: 'Sud America',
        tagline: 'Porta verso Machu Picchu e l\'impero Inca',
        heroImage: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800',
        coordinates: { lat: -13.5319, lng: -71.9675 },
        tags: ['adventure', 'historic', 'cultural', 'nature', 'trekking'],
        rating: 4.7,
        popularityScore: 81,
        priceLevel: 2,
        bestPeriod: ['Aprile', 'Maggio', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 4, max: 7 },
        timezone: 'GMT-5',
        language: ['Spagnolo', 'Quechua'],
        currency: 'PEN (Sol)',
        emergencyNumber: '105'
      },
      {
        id: 'cartagena',
        name: 'Cartagena',
        country: 'Colombia',
        continent: 'Sud America',
        tagline: 'Mura coloniali, colori e magia caraibica',
        heroImage: 'https://images.unsplash.com/photo-1583531172067-57601cf3e1b3?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1583531172067-57601cf3e1b3?w=800',
        coordinates: { lat: 10.3910, lng: -75.4794 },
        tags: ['romantic', 'beach', 'historic', 'cultural', 'foodie'],
        rating: 4.5,
        popularityScore: 74,
        priceLevel: 2,
        bestPeriod: ['Dicembre', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile'],
        suggestedDays: { min: 3, max: 5 },
        timezone: 'GMT-5',
        language: ['Spagnolo'],
        currency: 'COP (Peso)',
        emergencyNumber: '123'
      },
      // ===== OCEANIA =====
      {
        id: 'sydney',
        name: 'Sydney',
        country: 'Australia',
        continent: 'Oceania',
        tagline: 'Opera, surf e stile di vita all\'aperto',
        heroImage: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800',
        coordinates: { lat: -33.8688, lng: 151.2093 },
        tags: ['beach', 'cultural', 'foodie', 'nature', 'adventure'],
        rating: 4.6,
        popularityScore: 87,
        priceLevel: 4,
        bestPeriod: ['Settembre', 'Ottobre', 'Novembre', 'Marzo', 'Aprile'],
        suggestedDays: { min: 5, max: 8 },
        timezone: 'GMT+10',
        language: ['Inglese'],
        currency: 'AUD',
        emergencyNumber: '000'
      },
      {
        id: 'melbourne',
        name: 'Melbourne',
        country: 'Australia',
        continent: 'Oceania',
        tagline: 'Caffè, street art e cultura alternativa',
        heroImage: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800',
        coordinates: { lat: -37.8136, lng: 144.9631 },
        tags: ['cultural', 'foodie', 'art', 'nightlife', 'sports'],
        rating: 4.6,
        popularityScore: 82,
        priceLevel: 4,
        bestPeriod: ['Marzo', 'Aprile', 'Ottobre', 'Novembre'],
        suggestedDays: { min: 4, max: 6 },
        timezone: 'GMT+10',
        language: ['Inglese'],
        currency: 'AUD',
        emergencyNumber: '000'
      },
      {
        id: 'queenstown',
        name: 'Queenstown',
        country: 'Nuova Zelanda',
        continent: 'Oceania',
        tagline: 'Capitale mondiale dell\'avventura',
        heroImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        coordinates: { lat: -45.0312, lng: 168.6626 },
        tags: ['adventure', 'nature', 'skiing', 'photography', 'extreme'],
        rating: 4.8,
        popularityScore: 76,
        priceLevel: 4,
        bestPeriod: ['Dicembre', 'Gennaio', 'Febbraio', 'Giugno', 'Luglio', 'Agosto'],
        suggestedDays: { min: 4, max: 7 },
        timezone: 'GMT+12',
        language: ['Inglese'],
        currency: 'NZD',
        emergencyNumber: '111'
      },
      {
        id: 'fiji',
        name: 'Fiji',
        country: 'Fiji',
        continent: 'Oceania',
        tagline: 'Paradiso tropicale di 333 isole',
        heroImage: 'https://images.unsplash.com/photo-1584699173240-30a80ded5c68?w=1920',
        thumbnailImage: 'https://images.unsplash.com/photo-1584699173240-30a80ded5c68?w=800',
        coordinates: { lat: -17.7134, lng: 178.0650 },
        tags: ['beach', 'relaxation', 'romantic', 'diving', 'luxury'],
        rating: 4.7,
        popularityScore: 73,
        priceLevel: 4,
        bestPeriod: ['Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre'],
        suggestedDays: { min: 7, max: 14 },
        timezone: 'GMT+12',
        language: ['Inglese', 'Figiano'],
        currency: 'FJD',
        emergencyNumber: '911'
      }
    ];

    this.citiesSignal.set(cities);
  }
}

