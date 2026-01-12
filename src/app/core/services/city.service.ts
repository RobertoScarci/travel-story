import { Injectable, inject, signal } from '@angular/core';
import { City, CityDetails, CitySection, SectionItem, ViralContent, FlightDeal, HiddenGemInfo, HiddenGemReason } from '../models/city.model';
import { DatabaseService } from './database.service';
import { CitySeederService } from './city-seeder.service';
import { CityImagePopulatorService } from './city-image-populator.service';

/**
 * CityService - Data provider for city information
 * 
 * Now uses DatabaseService for persistent storage.
 * Automatically seeds database with new cities if empty.
 * Automatically populates missing images for all cities.
 * 
 * All data structures mirror expected API responses for seamless transition.
 */
@Injectable({
  providedIn: 'root'
})
export class CityService {
  private databaseService = inject(DatabaseService);
  private citySeeder = inject(CitySeederService);
  private imagePopulator = inject(CityImagePopulatorService);
  private citiesSignal = signal<City[]>([]);
  readonly cities = this.citiesSignal.asReadonly();
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize service - load cities from database, seed if empty, populate images
   */
  private async initialize(): Promise<void> {
    await this.databaseService.initialize();
    
    let cities = await this.databaseService.getAllCities();
    
    if (cities.length === 0) {
      // Database is empty: load mock data first, then seed new cities
      console.log('Database vuoto, inizializzazione...');
      
      // Load mock data and save to database
      this.initializeMockData();
      const mockCities = this.citiesSignal();
      await this.databaseService.saveCities(mockCities);
      
      // Now seed new cities (they will be merged with existing ones in database)
      console.log('Seeding nuove città...');
      await this.seedNewCities();
      
      // Reload all cities (mock + seeded)
      cities = await this.databaseService.getAllCities();
      this.citiesSignal.set(cities);
    } else {
      // Load existing cities from database
      this.citiesSignal.set(cities);
      
      // Check if we need to add new seeded cities (incrementally)
      this.addMissingSeededCities(cities);
    }
    
    // Populate missing images for all cities (in background, don't block)
    this.populateMissingImagesInBackground(cities);
    
    this.initialized = true;
  }

  /**
   * Add seeded cities that are not yet in the database
   */
  private async addMissingSeededCities(existingCities: City[]): Promise<void> {
    const existingIds = new Set(existingCities.map(c => c.id));
    const citiesToSeed = this.citySeeder.getCitiesToSeed();
    
    const missingCities = citiesToSeed.filter(cityInfo => {
      const id = this.generateCityId(cityInfo.name);
      return !existingIds.has(id);
    });
    
    if (missingCities.length > 0) {
      console.log(`Trovate ${missingCities.length} nuove città da aggiungere...`);
      // Seed only missing cities in background
      setTimeout(async () => {
        for (const cityInfo of missingCities) {
          try {
            const city = await this.citySeeder.seedCity(cityInfo);
            if (city) {
              const currentCities = this.citiesSignal();
              this.citiesSignal.set([...currentCities, city]);
            }
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.warn(`Errore seeding ${cityInfo.name}:`, error);
          }
        }
        console.log(`Aggiunte ${missingCities.length} nuove città`);
      }, 5000); // Wait 5 seconds after initialization
    }
  }

  /**
   * Generate city ID (same logic as CitySeederService)
   */
  private generateCityId(name: string): string {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Seed new cities from CitySeederService and save to database
   */
  private async seedNewCities(): Promise<void> {
    try {
      console.log('Inizio seeding di nuove città...');
      const result = await this.citySeeder.seedAllCities((cityName, current, total) => {
        if (current % 10 === 0) {
          console.log(`Seeding: ${cityName} (${current}/${total})`);
        }
      });
      console.log(`Seeding completato: ${result.success} successi, ${result.failed} falliti`);
    } catch (error) {
      console.error('Errore durante il seeding:', error);
    }
  }

  /**
   * Populate missing images for all cities in background
   */
  private async populateMissingImagesInBackground(cities: City[]): Promise<void> {
    // Run in background, don't block initialization
    setTimeout(async () => {
      console.log('Popolamento immagini mancanti in background...');
      let updatedCount = 0;
      
      for (const city of cities) {
        try {
          // Check if images are missing or invalid
          const hasValidThumbnail = city.thumbnailImage && 
            !city.thumbnailImage.toLowerCase().includes('placeholder') &&
            !city.thumbnailImage.toLowerCase().includes('default') &&
            city.thumbnailImage.trim() !== '';
          const hasValidHero = city.heroImage && 
            !city.heroImage.toLowerCase().includes('placeholder') &&
            !city.heroImage.toLowerCase().includes('default') &&
            city.heroImage.trim() !== '';
          
          if (!hasValidThumbnail || !hasValidHero) {
            const result = await this.imagePopulator.populateCityImages(city, true);
            
            if (result.updated) {
              // Reload from database to get updated city
              const updatedCity = await this.databaseService.getCity(city.id);
              if (updatedCity) {
                // Update signal
                const currentCities = this.citiesSignal();
                const cityIndex = currentCities.findIndex(c => c.id === city.id);
                if (cityIndex >= 0) {
                  currentCities[cityIndex] = updatedCity;
                  this.citiesSignal.set([...currentCities]);
                }
              }
              
              updatedCount++;
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.warn(`Errore popolamento immagini per ${city.name}:`, error);
        }
      }
      
      if (updatedCount > 0) {
        console.log(`Immagini aggiornate per ${updatedCount} città`);
      } else {
        console.log('Tutte le città hanno già immagini valide');
      }
    }, 2000); // Start after 2 seconds to not block initialization
  }

  /**
   * Refresh cities from database
   */
  async refreshCities(): Promise<void> {
    const cities = await this.databaseService.getAllCities();
    this.citiesSignal.set(cities);
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
   * Get emerging destinations (hidden gems) with improved selection logic
   * Uses multiple criteria: popularity, rating, cost, authenticity, unique experiences
   */
  getEmergingDestinations(limit: number = 4): City[] {
    return [...this.citiesSignal()]
      .map(city => ({
        city,
        hiddenGemInfo: this.calculateHiddenGemScore(city)
      }))
      .filter(item => {
        const { city, hiddenGemInfo } = item;
        // Must have at least 2 reasons to be a hidden gem
        return hiddenGemInfo.reasons.length >= 2 && 
               hiddenGemInfo.score >= 50 &&
               city.rating >= 4.0; // Minimum rating threshold
      })
      .sort((a, b) => b.hiddenGemInfo.score - a.hiddenGemInfo.score)
      .slice(0, limit)
      .map(item => item.city);
  }

  /**
   * Calculate hidden gem score and reasons for a city
   */
  calculateHiddenGemScore(city: City): HiddenGemInfo {
    const reasons: HiddenGemReason[] = [];
    let score = 0;

    // 1. Low popularity (but still good rating)
    if (city.popularityScore < 60 && city.rating >= 4.2) {
      reasons.push({
        type: 'low-popularity',
        label: 'Poco turistica',
        description: `Con un punteggio di popolarità di ${city.popularityScore}, questa destinazione offre un'esperienza autentica lontana dalle folle.`,
        icon: 'users'
      });
      score += 30;
    } else if (city.popularityScore < 70 && city.rating >= 4.0) {
      reasons.push({
        type: 'underrated',
        label: 'Sottovalutata',
        description: 'Una destinazione che merita più attenzione di quanta ne riceva.',
        icon: 'star'
      });
      score += 20;
    }

    // 2. Budget-friendly
    if (city.priceLevel <= 2) {
      reasons.push({
        type: 'budget-friendly',
        label: 'Accessibile',
        description: `Con un costo medio di ${'€'.repeat(city.priceLevel)}, offre un ottimo rapporto qualità-prezzo.`,
        icon: 'wallet'
      });
      score += 25;
    }

    // 3. Authentic experiences (based on tags)
    const authenticTags = ['cultura', 'storia', 'locale', 'tradizionale', 'autentico'];
    const hasAuthenticTags = city.tags.some(tag => 
      authenticTags.some(authTag => tag.toLowerCase().includes(authTag))
    );
    if (hasAuthenticTags) {
      reasons.push({
        type: 'authentic',
        label: 'Autentica',
        description: 'Un\'esperienza genuina lontana dai percorsi turistici più battuti.',
        icon: 'heart'
      });
      score += 20;
    }

    // 4. Unique experiences (based on tags)
    const uniqueTags = ['natura', 'avventura', 'spirituale', 'artistica', 'culinaria'];
    const hasUniqueTags = city.tags.some(tag => 
      uniqueTags.some(uniqueTag => tag.toLowerCase().includes(uniqueTag))
    );
    if (hasUniqueTags && city.rating >= 4.3) {
      reasons.push({
        type: 'unique-experience',
        label: 'Esperienza unica',
        description: 'Offre qualcosa di speciale che non troverai altrove.',
        icon: 'sparkles'
      });
      score += 25;
    }

    // 5. Emerging destination (low popularity but high rating)
    if (city.popularityScore < 50 && city.rating >= 4.5) {
      reasons.push({
        type: 'emerging',
        label: 'In crescita',
        description: 'Una destinazione emergente che sta guadagnando popolarità tra i viaggiatori esperti.',
        icon: 'trending-up'
      });
      score += 15;
    }

    // Generate description
    const description = this.generateHiddenGemDescription(city, reasons);

    return {
      reasons,
      score: Math.min(100, score),
      description
    };
  }

  /**
   * Generate a human-readable description of why a city is a hidden gem
   */
  private generateHiddenGemDescription(city: City, reasons: HiddenGemReason[]): string {
    if (reasons.length === 0) return '';

    const primaryReason = reasons[0];
    
    switch (primaryReason.type) {
      case 'low-popularity':
        return `Una destinazione poco conosciuta ma con un rating di ${city.rating}/5, perfetta per chi cerca autenticità.`;
      case 'budget-friendly':
        return `Offre un'esperienza straordinaria a un prezzo accessibile (${'€'.repeat(city.priceLevel)}), ideale per viaggiatori attenti al budget.`;
      case 'authentic':
        return `Un'esperienza autentica e genuina, lontana dai percorsi turistici più battuti.`;
      case 'unique-experience':
        return `Offre esperienze uniche e indimenticabili che non troverai in altre destinazioni.`;
      case 'underrated':
        return `Sottovalutata ma con un potenziale enorme, merita sicuramente una visita.`;
      case 'emerging':
        return `Una destinazione emergente che sta guadagnando popolarità tra i viaggiatori esperti.`;
      default:
        return `Una gemma nascosta che vale la pena scoprire.`;
    }
  }

  /**
   * Get hidden gem information for a specific city
   */
  getHiddenGemInfo(cityId: string): HiddenGemInfo | null {
    const city = this.getCityById(cityId);
    if (!city) return null;
    
    const info = this.calculateHiddenGemScore(city);
    // Only return if it's actually a hidden gem
    if (info.reasons.length >= 2 && info.score >= 50) {
      return info;
    }
    return null;
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
      // ===== ASIA =====
      'tokyo': {
        intro: 'Una metropoli dove il futuro incontra la tradizione millenaria. Tokyo non si visita, si vive.',
        atmosphere: 'Neon sfavillanti, templi silenziosi, izakaya nascosti e grattacieli che toccano le nuvole.',
        uniqueAspect: 'L\'ordine perfetto nel caos apparente, dove ogni dettaglio è curato con precisione maniacale.',
        travellerTypes: ['Explorer urbani', 'Amanti della cultura', 'Foodie', 'Tech enthusiast']
      },
      'kyoto': {
        intro: 'L\'antica capitale imperiale dove il Giappone tradizionale vive ancora oggi.',
        atmosphere: 'Geishe che scivolano tra vicoli di legno, giardini zen perfetti, templi dorati al tramonto.',
        uniqueAspect: 'Più di 2000 templi e santuari concentrati in una sola città, patrimonio UNESCO.',
        travellerTypes: ['Amanti della cultura', 'Fotografi', 'Spirituali', 'Romantici']
      },
      'bali': {
        intro: 'L\'isola degli dei dove spiritualità e bellezza naturale si fondono in armonia.',
        atmosphere: 'Risaie a terrazza, templi tra le nuvole, tramonti infuocati e cerimonie induiste quotidiane.',
        uniqueAspect: 'Ogni giorno è una celebrazione: offerte floreali, incenso e preghiere ovunque.',
        travellerTypes: ['Yogi', 'Surfisti', 'Digital nomad', 'Coppie in luna di miele']
      },
      'bangkok': {
        intro: 'La città degli angeli: un turbinio di templi dorati, street food e contrasti estremi.',
        atmosphere: 'Buddha giganti, mercati galleggianti, grattacieli e tuk-tuk che sfrecciano nel traffico.',
        uniqueAspect: 'Il cibo di strada è arte: ogni vicolo nasconde un piatto che può cambiare la vita.',
        travellerTypes: ['Foodie', 'Backpacker', 'Amanti del caos organizzato', 'Nottambuli']
      },
      'singapore': {
        intro: 'La città-stato dove l\'Asia incontra il futuro in un giardino tropicale verticale.',
        atmosphere: 'Grattacieli avveniristici, hawker center fumanti, Gardens by the Bay illuminati.',
        uniqueAspect: 'Quattro culture (cinese, malese, indiana, occidentale) convivono in perfetta armonia.',
        travellerTypes: ['Famiglie', 'Business traveller', 'Foodie', 'Amanti del design']
      },
      'seoul': {
        intro: 'Dove antichi palazzi imperiali incontrano il K-pop e la tecnologia più avanzata.',
        atmosphere: 'Hanok tradizionali, skincare routine, BBQ coreano fumante e neon di Gangnam.',
        uniqueAspect: 'Una città che non dorme mai, dove tradizione e innovazione coesistono naturalmente.',
        travellerTypes: ['Appassionati K-culture', 'Techie', 'Foodie', 'Fashionisti']
      },
      'hanoi': {
        intro: 'Mille anni di storia vietnamita tra laghi sacri, pagode e il profumo del phở.',
        atmosphere: 'Motorini che sciamano, venditrici con il cappello conico, caffè a goccia sul marciapiede.',
        uniqueAspect: 'Il Quartiere Vecchio: 36 strade, ognuna dedicata a un mestiere diverso da secoli.',
        travellerTypes: ['Backpacker', 'Amanti della storia', 'Foodie', 'Avventurieri']
      },
      'dubai': {
        intro: 'Dove l\'impossibile diventa realtà: dal deserto è sorta la città dei record.',
        atmosphere: 'Il Burj Khalifa che tocca il cielo, mall infiniti, isole artificiali e lusso sfrenato.',
        uniqueAspect: 'In 50 anni è passata da villaggio di pescatori a metropoli futuristica.',
        travellerTypes: ['Amanti del lusso', 'Shopaholic', 'Famiglie', 'Architetti']
      },
      // ===== EUROPA =====
      'lisbon': {
        intro: 'Sette colli affacciati sull\'Atlantico, dove la malinconia del fado si mescola alla vitalità moderna.',
        atmosphere: 'Azulejos che raccontano storie, tram gialli che arrancano, pastéis de nata appena sfornati.',
        uniqueAspect: 'La "saudade" portoghese: un sentimento unico che permea ogni angolo della città.',
        travellerTypes: ['Romantici', 'Amanti del cibo', 'Fotografi', 'Budget traveller']
      },
      'barcelona': {
        intro: 'Gaudí, tapas e Mediterráneo: una città che è un\'opera d\'arte a cielo aperto.',
        atmosphere: 'La Sagrada Familia che svetta, Las Ramblas che pulsa, spiagge urbane al tramonto.',
        uniqueAspect: 'L\'architettura modernista catalana: ogni edificio è una sorpresa impossibile.',
        travellerTypes: ['Amanti dell\'arte', 'Festaioli', 'Foodie', 'Beach lover']
      },
      'paris': {
        intro: 'La ville lumière: arte, moda, amore e croissant in ogni angolo.',
        atmosphere: 'La Tour Eiffel che scintilla, café dove nascono rivoluzioni, bouquinistes sulla Senna.',
        uniqueAspect: 'Ogni quartiere è un villaggio con la sua anima: Montmartre, Le Marais, Saint-Germain.',
        travellerTypes: ['Romantici', 'Fashionisti', 'Amanti dell\'arte', 'Gourmet']
      },
      'rome': {
        intro: 'La Città Eterna dove 3000 anni di storia si vivono passeggiando.',
        atmosphere: 'Il Colosseo al tramonto, fontane barocche, carbonara perfetta in una trattoria nascosta.',
        uniqueAspect: 'Ogni scavo rivela nuove meraviglie: la storia qui è letteralmente sotto i piedi.',
        travellerTypes: ['Amanti della storia', 'Foodie', 'Romantici', 'Pellegrini']
      },
      'amsterdam': {
        intro: 'Canali, biciclette e libertà: una città che ha fatto dell\'apertura mentale la sua bandiera.',
        atmosphere: 'Case storte sui canali, mercati di fiori, musei straordinari e coffeeshop discreti.',
        uniqueAspect: 'Il 40% della città è sotto il livello del mare: un trionfo dell\'ingegno olandese.',
        travellerTypes: ['Ciclisti', 'Amanti dell\'arte', 'Alternativi', 'Romantici']
      },
      'prague': {
        intro: 'La città delle cento torri dove il gotico incontra la birra migliore d\'Europa.',
        atmosphere: 'Il Ponte Carlo all\'alba, l\'Orologio Astronomico, birrifici secolari, jazz nei sotterranei.',
        uniqueAspect: 'Il centro storico è patrimonio UNESCO praticamente intatto dal Medioevo.',
        travellerTypes: ['Amanti della storia', 'Beer lover', 'Romantici', 'Budget traveller']
      },
      'vienna': {
        intro: 'Caffè, valzer e torte: l\'eleganza imperiale degli Asburgo vive ancora.',
        atmosphere: 'Palazzi barocchi, Opera che incanta, Sachertorte nei caffè storici, Klimt dorato.',
        uniqueAspect: 'La tradizione dei Kaffeehäuser: caffè come istituzioni culturali da 300 anni.',
        travellerTypes: ['Amanti della musica classica', 'Gourmet', 'Storici', 'Eleganti']
      },
      'reykjavik': {
        intro: 'La capitale più settentrionale del mondo, porta verso paesaggi lunari.',
        atmosphere: 'Aurora boreale, geyser, lana islandese, musica indie e bagni geotermali.',
        uniqueAspect: 'L\'Islanda ha più librerie pro-capite di qualsiasi altro paese al mondo.',
        travellerTypes: ['Amanti della natura', 'Avventurieri', 'Fotografi', 'Hipster']
      },
      'athens': {
        intro: 'La culla della civiltà occidentale: dove la democrazia e la filosofia sono nate.',
        atmosphere: 'L\'Acropoli che domina, taverne con retsina, gatti ovunque, il mare Egeo all\'orizzonte.',
        uniqueAspect: '3400 anni di storia continua: la città più antica d\'Europa ancora abitata.',
        travellerTypes: ['Amanti della storia', 'Filosofi', 'Beach lover', 'Budget traveller']
      },
      'florence': {
        intro: 'La culla del Rinascimento: ogni passo è un incontro con Michelangelo e Leonardo.',
        atmosphere: 'Il Duomo che svetta, l\'Arno che scorre, botteghe artigiane, bistecca alla fiorentina.',
        uniqueAspect: 'Il centro storico contiene più capolavori per metro quadro di qualsiasi altra città.',
        travellerTypes: ['Amanti dell\'arte', 'Gourmet', 'Romantici', 'Storici']
      },
      'santorini': {
        intro: 'Tramonti leggendari, cupole blu e vino vulcanico su un\'isola da sogno.',
        atmosphere: 'Case bianche a strapiombo sulla caldera, bouganville viola, sole che si tuffa nel mare.',
        uniqueAspect: 'È il cratere di un vulcano esploso 3600 anni fa, forse l\'Atlantide di Platone.',
        travellerTypes: ['Romantici', 'Fotografi', 'Luna di miele', 'Amanti del vino']
      },
      'dubrovnik': {
        intro: 'La perla dell\'Adriatico: mura medievali che abbracciano il mare cristallino.',
        atmosphere: 'Strade di marmo lucido, fortificazioni possenti, ristoranti con vista, Game of Thrones.',
        uniqueAspect: 'La repubblica di Ragusa fu una delle prime a abolire la schiavitù nel 1416.',
        travellerTypes: ['Amanti della storia', 'Seriali addicted', 'Beach lover', 'Fotografi']
      },
      // ===== AFRICA =====
      'marrakech': {
        intro: 'Un caleidoscopio di colori, profumi e suoni che risveglia tutti i sensi.',
        atmosphere: 'Spezie nei souk, chiamate alla preghiera, giardini segreti dietro mura ocra.',
        uniqueAspect: 'La capacità di trasportarti in un\'altra epoca, dove il tempo scorre diversamente.',
        travellerTypes: ['Avventurieri', 'Amanti dell\'artigianato', 'Fotografi', 'Cercatori di esperienze']
      },
      'capetown': {
        intro: 'Dove due oceani si incontrano sotto una delle montagne più iconiche del mondo.',
        atmosphere: 'La Table Mountain avvolta di nuvole, vigneti, pinguini e township vibranti.',
        uniqueAspect: 'È l\'unica città al mondo con pinguini africani sulle spiagge urbane.',
        travellerTypes: ['Amanti della natura', 'Enologi', 'Avventurieri', 'Fotografi']
      },
      'cairo': {
        intro: 'Le Piramidi all\'orizzonte: 5000 anni di storia che ti lasciano senza fiato.',
        atmosphere: 'Il Nilo che scorre eterno, minareti che chiamano, bazar che non dormono mai.',
        uniqueAspect: 'L\'unica delle Sette Meraviglie del mondo antico ancora in piedi.',
        travellerTypes: ['Amanti della storia', 'Avventurieri', 'Archeologi in erba', 'Fotografi']
      },
      'zanzibar': {
        intro: 'L\'isola delle spezie: spiagge paradisiache e storia swahili millenaria.',
        atmosphere: 'Stone Town labirintica, dhow al tramonto, profumo di chiodi di garofano ovunque.',
        uniqueAspect: 'Fu il più grande mercato di spezie e schiavi dell\'Africa orientale.',
        travellerTypes: ['Beach lover', 'Storici', 'Romantici', 'Subacquei']
      },
      // ===== NORD AMERICA =====
      'newyork': {
        intro: 'La città che non dorme mai: qui tutto è più grande, più veloce, più intenso.',
        atmosphere: 'Times Square che abbaglia, Central Park che respira, subway che pulsa 24/7.',
        uniqueAspect: 'Più di 800 lingue parlate: è la città più diversa linguisticamente del pianeta.',
        travellerTypes: ['Explorer urbani', 'Fashionisti', 'Amanti del teatro', 'Foodie']
      },
      'losangeles': {
        intro: 'Sogni sotto il sole: Hollywood, spiagge infinite e la fabbrica dei desideri.',
        atmosphere: 'Palme sulla sunset strip, star sull\'Hollywood Walk, surf a Venice Beach.',
        uniqueAspect: 'Qui è nato il cinema: ogni angolo è stato set di un film iconico.',
        travellerTypes: ['Cinefili', 'Beach lover', 'Fashionisti', 'Creativi']
      },
      'sanfrancisco': {
        intro: 'Nebbia, ponti iconici e spirito ribelle: la capitale dell\'innovazione mondiale.',
        atmosphere: 'Il Golden Gate nella foschia, cable car che arrancano, Painted Ladies vittoriane.',
        uniqueAspect: 'Da qui sono partite le rivoluzioni tech, hippie e LGBTQ+ che hanno cambiato il mondo.',
        travellerTypes: ['Techie', 'Hipster', 'Amanti della controcultura', 'Foodie']
      },
      'miami': {
        intro: 'Art Deco, ritmi latini e spiagge infinite: l\'America che parla spagnolo.',
        atmosphere: 'Ocean Drive al neon, mojito sulla spiaggia, Little Havana che balla salsa.',
        uniqueAspect: 'È l\'unica grande città americana fondata da una donna (Julia Tuttle, 1896).',
        travellerTypes: ['Festaioli', 'Beach lover', 'Amanti dell\'Art Deco', 'Latini']
      },
      'vancouver': {
        intro: 'Montagne che si tuffano nell\'oceano: natura selvaggia alle porte della metropoli.',
        atmosphere: 'Kayak tra le orche, sci al mattino, sushi pluripremiato la sera, Stanley Park.',
        uniqueAspect: 'Votata ripetutamente la città più vivibile del mondo.',
        travellerTypes: ['Amanti della natura', 'Sportivi', 'Foodie', 'Eco-conscious']
      },
      'mexicocity': {
        intro: 'Sulle rovine azteche: 700 anni di storia, arte muralista e tacos perfetti.',
        atmosphere: 'Murales di Diego Rivera, mariachi a Garibaldi, mercati infiniti, Frida ovunque.',
        uniqueAspect: 'Costruita sui resti di Tenochtitlan, capitale azteca, su un lago prosciugato.',
        travellerTypes: ['Amanti dell\'arte', 'Foodie', 'Storici', 'Avventurieri']
      },
      // ===== SUD AMERICA =====
      'buenosaires': {
        intro: 'Tango, bistecca e passione: la Parigi del Sudamerica con anima latina.',
        atmosphere: 'Milongas fumose, La Boca colorata, caffè letterari, asado domenicale.',
        uniqueAspect: 'Ha più teatri pro-capite di qualsiasi altra città al mondo.',
        travellerTypes: ['Amanti del tango', 'Carnivori', 'Romantici', 'Nottambuli']
      },
      'riodejaneiro': {
        intro: 'Il Cristo che abbraccia: samba, spiagge leggendarie e energia contagiosa.',
        atmosphere: 'Copacabana al tramonto, favela che pulsa, Carnevale che esplode, caipirinha in mano.',
        uniqueAspect: 'Il Carnevale di Rio è lo spettacolo più grande del mondo: 2 milioni di persone in strada.',
        travellerTypes: ['Festaioli', 'Beach lover', 'Sportivi', 'Amanti della musica']
      },
      'cusco': {
        intro: 'L\'ombelico del mondo: porta d\'accesso a Machu Picchu e all\'impero Inca.',
        atmosphere: 'Mura inca perfette, mercati andini colorati, pisco sour in piazza, lama ovunque.',
        uniqueAspect: 'A 3400m di altitudine: preparati all\'altura e alla coca tea.',
        travellerTypes: ['Trekker', 'Storici', 'Avventurieri', 'Spirituali']
      },
      'cartagena': {
        intro: 'Mura coloniali che racchiudono la magia caraibica della Colombia.',
        atmosphere: 'Balconi fioriti, colori pastello, ritmi di cumbia, ceviche sulla terrazza.',
        uniqueAspect: 'Il centro storico è un museo vivente: patrimonio UNESCO dal 1984.',
        travellerTypes: ['Romantici', 'Storici', 'Beach lover', 'Foodie']
      },
      // ===== OCEANIA =====
      'sydney': {
        intro: 'L\'Opera, il ponte, il surf: l\'Australia inizia qui con stile.',
        atmosphere: 'Harbour Bridge all\'alba, surfisti a Bondi, brunch infiniti, multiculturalità.',
        uniqueAspect: 'L\'Opera House ha oltre 1 milione di piastrelle che cambiano colore con la luce.',
        travellerTypes: ['Beach lover', 'Foodie', 'Amanti dell\'architettura', 'Surfisti']
      },
      'melbourne': {
        intro: 'Caffè, street art e cultura alternativa: l\'anima cool dell\'Australia.',
        atmosphere: 'Laneways piene di graffiti, baristi perfezionisti, mercati vintage, AFL fever.',
        uniqueAspect: 'Considerata la capitale mondiale del caffè specialty.',
        travellerTypes: ['Hipster', 'Amanti del caffè', 'Artisti', 'Foodie']
      },
      'queenstown': {
        intro: 'La capitale mondiale dell\'avventura: adrenalina garantita tra montagne e laghi.',
        atmosphere: 'Bungee jumping, jet boat, heli-ski, poi Fergburger alle 2 di notte.',
        uniqueAspect: 'Qui è nato il bungee jumping commerciale: tutto è iniziato dal Kawarau Bridge.',
        travellerTypes: ['Adrenalinici', 'Sciatori', 'Amanti della natura', 'Avventurieri']
      },
      'fiji': {
        intro: 'Bula! 333 isole di paradiso tropicale dove il tempo rallenta.',
        atmosphere: 'Spiagge deserte, resort sull\'acqua, snorkeling tra i coralli, kava ceremony.',
        uniqueAspect: 'Il primo paese al mondo a vedere l\'alba ogni giorno (fuso orario GMT+12/13).',
        travellerTypes: ['Romantici', 'Subacquei', 'Luna di miele', 'Relax seeker']
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
      // ===== ASIA =====
      'tokyo': [
        { id: '1', title: 'Tempio Senso-ji', description: 'Il tempio più antico di Tokyo, un\'oasi di spiritualità nel cuore di Asakusa. La porta Kaminarimon con la sua lanterna rossa è iconica.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&q=80' },
        { id: '2', title: 'Shibuya Crossing', description: 'L\'incrocio più trafficato del mondo: fino a 3000 persone lo attraversano ogni cambio di semaforo.', duration: '30 min', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&q=80' },
        { id: '3', title: 'Meiji Shrine', description: 'Santuario shintoista dedicato all\'imperatore Meiji, immerso in una foresta di 100.000 alberi donati da tutto il Giappone.', duration: '1-2 ore', image: 'https://images.unsplash.com/photo-1583766395091-2eb9994ed094?w=1200&q=80' },
        { id: '4', title: 'TeamLab Borderless', description: 'Museo d\'arte digitale immersivo dove le opere si muovono, interagiscono e sfumano l\'una nell\'altra.', duration: '3-4 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1200&q=80' },
        { id: '5', title: 'Tokyo Skytree', description: 'La torre più alta del Giappone (634m) con vista a 360° sulla città fino al Monte Fuji.', duration: '2 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=1200&q=80' },
        { id: '6', title: 'Quartiere di Harajuku', description: 'Il centro della moda giovanile giapponese: Takeshita Street è un\'esplosione di colori e creatività.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1554797589-7241bb691973?w=1200&q=80' }
      ],
      'kyoto': [
        { id: '1', title: 'Fushimi Inari-Taisha', description: 'Il santuario dei 10.000 torii rossi che formano tunnel suggestivi lungo la montagna.', duration: '3-4 ore', image: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=1200&q=80' },
        { id: '2', title: 'Kinkaku-ji (Padiglione d\'Oro)', description: 'Tempio zen ricoperto di foglia d\'oro che si riflette perfettamente nel lago.', duration: '1-2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80' },
        { id: '3', title: 'Arashiyama Bamboo Grove', description: 'Passeggiata tra altissime canne di bambù che ondeggiano nel vento: pura magia.', duration: '2 ore', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80' },
        { id: '4', title: 'Quartiere di Gion', description: 'Il distretto delle geishe: case di legno tradizionali e possibili incontri con maiko.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&q=80' },
        { id: '5', title: 'Tempio Kiyomizu-dera', description: 'Tempio UNESCO con terrazza in legno sospesa a 13 metri, costruito senza un solo chiodo.', duration: '2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1200&q=80' }
      ],
      'bali': [
        { id: '1', title: 'Tegallalang Rice Terraces', description: 'Iconiche risaie a terrazze verdi scolpite nella collina secondo il sistema subak millenario.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80' },
        { id: '2', title: 'Tempio di Tanah Lot', description: 'Tempio indù sul mare, spettacolare al tramonto quando la marea sale e lo isola.', duration: '2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=1200&q=80' },
        { id: '3', title: 'Ubud Monkey Forest', description: 'Foresta sacra con oltre 700 macachi e templi antichi avvolti dalle radici degli alberi.', duration: '2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1200&q=80' },
        { id: '4', title: 'Tempio Uluwatu', description: 'Tempio arroccato su una scogliera a picco sull\'oceano, famoso per la danza Kecak al tramonto.', duration: '3 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200&q=80' },
        { id: '5', title: 'Gates of Heaven (Lempuyang)', description: 'Il famoso portale con vista sul vulcano Agung: la foto più instagrammata di Bali.', duration: '4 ore', image: 'https://images.unsplash.com/photo-1604922824961-87cefb2e4b07?w=1200&q=80' }
      ],
      'bangkok': [
        { id: '1', title: 'Grand Palace', description: 'L\'abbagliante residenza reale: 200.000 mq di templi dorati e architettura thai.', duration: '3-4 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1200&q=80' },
        { id: '2', title: 'Wat Arun', description: 'Il Tempio dell\'Alba decorato con porcellane cinesi che brillano al sole.', duration: '1-2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=1200&q=80' },
        { id: '3', title: 'Wat Pho', description: 'Casa del Buddha sdraiato di 46 metri coperto d\'oro e scuola storica di massaggio thai.', duration: '2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=80' },
        { id: '4', title: 'Mercato galleggiante Damnoen Saduak', description: 'Venditori su barchette vendono frutta, cibo e souvenir lungo i canali.', duration: '4 ore', image: 'https://images.unsplash.com/photo-1552829327-fc95d43fbc13?w=1200&q=80' },
        { id: '5', title: 'Chatuchak Weekend Market', description: 'Uno dei mercati più grandi del mondo: 15.000 bancarelle su 35 acri.', duration: '4-5 ore', image: 'https://images.unsplash.com/photo-1559628233-100c798642d4?w=1200&q=80' }
      ],
      'singapore': [
        { id: '1', title: 'Gardens by the Bay', description: 'Giardini futuristici con Supertree di 50 metri, Cloud Forest e Flower Dome.', duration: '4-5 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&q=80' },
        { id: '2', title: 'Marina Bay Sands', description: 'L\'iconico hotel con la nave sul tetto e l\'infinity pool più alta del mondo.', duration: '2-3 ore', priceRange: '€€€', image: 'https://images.unsplash.com/photo-1508062878650-88b52897f298?w=1200&q=80' },
        { id: '3', title: 'Hawker Centres', description: 'Templi del cibo dove assaggiare la cucina di strada stellata Michelin a pochi euro.', duration: '2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' },
        { id: '4', title: 'Chinatown & Little India', description: 'Due quartieri etnici vibranti con templi, mercati e cibo autentico.', duration: '3-4 ore', image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=1200&q=80' },
        { id: '5', title: 'Sentosa Island', description: 'Isola del divertimento con spiagge, Universal Studios e S.E.A. Aquarium.', duration: '1 giorno', priceRange: '€€€', image: 'https://images.unsplash.com/photo-1574227492706-f65b24c3688a?w=1200&q=80' }
      ],
      'seoul': [
        { id: '1', title: 'Gyeongbokgung Palace', description: 'Il più grande dei Cinque Palazzi Reali, con cambio della guardia coreana.', duration: '3 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1574879788149-e3207888c51e?w=1200&q=80' },
        { id: '2', title: 'Bukchon Hanok Village', description: 'Quartiere di 600 anni con case tradizionali hanok dove vivono ancora residenti.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1575178578814-bfed6aa8f6d1?w=1200&q=80' },
        { id: '3', title: 'N Seoul Tower', description: 'Torre sul monte Namsan con lucchetti dell\'amore e vista notturna spettacolare.', duration: '2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1570544982537-5e48febe7f1f?w=1200&q=80' },
        { id: '4', title: 'Dongdaemun Design Plaza', description: 'Architettura futuristica di Zaha Hadid, hub di design e mercati notturni.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200&q=80' },
        { id: '5', title: 'Gangnam', description: 'Il quartiere del K-pop, luxury shopping e locali notturni esclusivi.', duration: '3-4 ore', image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200&q=80' }
      ],
      'hanoi': [
        { id: '1', title: 'Quartiere Vecchio (36 Streets)', description: 'Labirinto di vie medievali, ognuna dedicata a un mestiere specifico.', duration: '3-4 ore', image: 'https://images.unsplash.com/photo-1559615736-8c8f4b0e7e0a?w=1200&q=80' },
        { id: '2', title: 'Tempio della Letteratura', description: 'La prima università del Vietnam (1070 d.C.), giardini confuciani sereni.', duration: '1-2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80' },
        { id: '3', title: 'Mausoleo di Ho Chi Minh', description: 'Il padre della nazione riposa qui: file lunghe ma esperienza toccante.', duration: '2 ore', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a92?w=1200&q=80' },
        { id: '4', title: 'Lago Hoan Kiem', description: 'Il lago della Spada Restituita, cuore romantico della città con la Pagoda.', duration: '1-2 ore', image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80' },
        { id: '5', title: 'Water Puppet Theatre', description: 'Arte tradizionale di marionette sull\'acqua: spettacolo unico al mondo.', duration: '1 ora', priceRange: '€', image: 'https://images.unsplash.com/photo-1583573636246-18cb2246697f?w=1200&q=80' }
      ],
      'dubai': [
        { id: '1', title: 'Burj Khalifa', description: 'L\'edificio più alto del mondo (828m): la vista dal 148° piano toglie il fiato.', duration: '2-3 ore', priceRange: '€€€', image: 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200&q=80' },
        { id: '2', title: 'Dubai Mall', description: 'Il centro commerciale più grande del mondo con acquario, pista di pattinaggio e 1200 negozi.', duration: '4-5 ore', image: 'https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=1200&q=80' },
        { id: '3', title: 'Palm Jumeirah', description: 'L\'isola artificiale a forma di palma visibile dallo spazio.', duration: '3-4 ore', image: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=1200&q=80' },
        { id: '4', title: 'Dubai Marina', description: 'Grattacieli futuristici lungo un canale artificiale con yacht di lusso.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80' },
        { id: '5', title: 'Souq dell\'Oro e delle Spezie', description: 'I mercati tradizionali: tonnellate d\'oro in vetrina e spezie profumate.', duration: '2 ore', image: 'https://images.unsplash.com/photo-1548786811-dd6e453ccca7?w=1200&q=80' },
        { id: '6', title: 'Safari nel deserto', description: 'Dune bashing, cena beduina, danze del ventre sotto le stelle.', duration: '6 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=1200&q=80' }
      ],
      // ===== EUROPA =====
      'lisbon': [
        { id: '1', title: 'Torre di Belém', description: 'Fortezza manuelina del 1515, simbolo dell\'era delle grandi scoperte portoghesi.', duration: '1 ora', priceRange: '€', image: 'https://images.unsplash.com/photo-1548707309-dcebeab9ea9b?w=1200&q=80' },
        { id: '2', title: 'Alfama', description: 'Il quartiere più antico: vicoli medievali, case di fado, azulejos e panni stesi.', duration: '3-4 ore', image: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1200&q=80' },
        { id: '3', title: 'Monastero dos Jerónimos', description: 'Capolavoro gotico-manuelino, riposo di Vasco da Gama. Patrimonio UNESCO.', duration: '2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1580323956656-26bbb7b4e25a?w=1200&q=80' },
        { id: '4', title: 'Tram 28', description: 'Il tram giallo storico che arranca per i sette colli: attrazione in sé.', duration: '1 ora', priceRange: '€', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&q=80' },
        { id: '5', title: 'LX Factory', description: 'Ex fabbrica trasformata in hub creativo: ristoranti, libreria, street art.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1588860939990-56dc0a5d0785?w=1200&q=80' }
      ],
      'barcelona': [
        { id: '1', title: 'Sagrada Familia', description: 'Il capolavoro incompiuto di Gaudí: iniziato nel 1882, previsto completamento 2026.', duration: '2-3 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&q=80' },
        { id: '2', title: 'Park Güell', description: 'Giardino pubblico con mosaici colorati e salamandra iconica di Gaudí.', duration: '2-3 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?w=1200&q=80' },
        { id: '3', title: 'La Rambla', description: 'Il viale pedonale più famoso della Spagna: artisti di strada, mercato e caos.', duration: '1-2 ore', image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=1200&q=80' },
        { id: '4', title: 'Barrio Gótico', description: 'Quartiere medievale con la Cattedrale, piazze nascoste e tapas bar autentici.', duration: '3 ore', image: 'https://images.unsplash.com/photo-1579282240050-352db0a14c21?w=1200&q=80' },
        { id: '5', title: 'Casa Batlló', description: 'La casa del drago di Gaudí: facciata ondulata, balconi-teschi, interni surreali.', duration: '1-2 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729?w=1200&q=80' },
        { id: '6', title: 'Barceloneta Beach', description: 'La spiaggia urbana più famosa: paella, sangria e beach volley.', duration: '4 ore', image: 'https://images.unsplash.com/photo-1507619579562-f2e10da1ec86?w=1200&q=80' }
      ],
      'paris': [
        { id: '1', title: 'Tour Eiffel', description: 'La Dame de Fer: 330 metri, 18.000 pezzi metallici, 7 milioni di visitatori/anno.', duration: '2-3 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1200&q=80' },
        { id: '2', title: 'Museo del Louvre', description: 'Il museo più visitato al mondo: Monna Lisa, Venere di Milo e 380.000 opere.', duration: '4-6 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&q=80' },
        { id: '3', title: 'Montmartre', description: 'La collina degli artisti: Sacré-Cœur, pittori in Place du Tertre, cabaret.', duration: '3-4 ore', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=1200&q=80' },
        { id: '4', title: 'Champs-Élysées', description: 'Il viale più bello del mondo: dall\'Arco di Trionfo a Place de la Concorde.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=1200&q=80' },
        { id: '5', title: 'Notre-Dame', description: 'La cattedrale gotica in restauro dopo l\'incendio 2019. Cantiere storico visibile.', duration: '1 ora', image: 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=1200&q=80' },
        { id: '6', title: 'Musée d\'Orsay', description: 'Stazione ferroviaria trasformata in tempio dell\'Impressionismo: Monet, Renoir, Van Gogh.', duration: '3-4 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1591289009723-aef0a1a8a211?w=1200&q=80' }
      ],
      'rome': [
        { id: '1', title: 'Colosseo', description: 'L\'anfiteatro dei gladiatori: 50.000 spettatori, 2000 anni di storia.', duration: '2-3 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80' },
        { id: '2', title: 'Fontana di Trevi', description: 'Lancia una moneta e tornerai a Roma. 3000€ al giorno finiscono in beneficenza.', duration: '30 min', image: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=1200&q=80' },
        { id: '3', title: 'Musei Vaticani e Cappella Sistina', description: 'Michelangelo, Raffaello e 2000 anni di arte sacra. Il soffitto è indimenticabile.', duration: '4-5 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=1200&q=80' },
        { id: '4', title: 'Pantheon', description: 'Tempio di 2000 anni con la cupola in calcestruzzo non armato più grande del mondo.', duration: '1 ora', image: 'https://images.unsplash.com/photo-1548585744-eed1b5f28f01?w=1200&q=80' },
        { id: '5', title: 'Trastevere', description: 'Il quartiere più romano di Roma: vicoli acciottolati, trattorie, movida notturna.', duration: '3-4 ore', image: 'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=1200&q=80' },
        { id: '6', title: 'Fori Imperiali', description: 'Passeggiata tra le rovine del centro politico dell\'Impero Romano.', duration: '2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=1200&q=80' }
      ],
      'amsterdam': [
        { id: '1', title: 'Rijksmuseum', description: 'Il museo nazionale: Rembrandt, Vermeer e 8000 oggetti del Secolo d\'Oro.', duration: '3-4 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=1200&q=80' },
        { id: '2', title: 'Casa di Anna Frank', description: 'Il rifugio segreto dove Anne scrisse il diario. Prenota mesi prima.', duration: '1-2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1584003564911-a5e1e7bfe3da?w=1200&q=80' },
        { id: '3', title: 'Van Gogh Museum', description: 'La più grande collezione al mondo di Van Gogh: 200 dipinti, 500 disegni.', duration: '2-3 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1617391654483-79f7b6d6f1b6?w=1200&q=80' },
        { id: '4', title: 'Canali (Grachten)', description: 'UNESCO: 165 canali, 1500 ponti, case storte del XVII secolo.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&q=80' },
        { id: '5', title: 'Vondelpark', description: 'Il Central Park di Amsterdam: picnic, concerti, relax tra i tulipani.', duration: '2 ore', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80' },
        { id: '6', title: 'Jordaan', description: 'Quartiere bohémien con gallerie, vintage shop, café e bruin cafe storici.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1576924542622-772e0a02a6b2?w=1200&q=80' }
      ],
      'prague': [
        { id: '1', title: 'Ponte Carlo', description: '30 statue barocche sorvegliano il ponte gotico più romantico d\'Europa. Vai all\'alba.', duration: '1-2 ore', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200&q=80' },
        { id: '2', title: 'Orologio Astronomico', description: 'Ogni ora dal 1410 le figurine si animano: l\'orologio funzionante più antico del mondo.', duration: '30 min', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a92?w=1200&q=80' },
        { id: '3', title: 'Castello di Praga', description: 'Il più grande castello antico del mondo: Cattedrale di San Vito, Vicolo d\'Oro.', duration: '4-5 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1541855951501-f3b53f73f8ec?w=1200&q=80' },
        { id: '4', title: 'Quartiere Ebraico', description: 'Sinagoghe storiche, il vecchio cimitero con 12.000 lapidi accatastate.', duration: '2-3 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1200&q=80' },
        { id: '5', title: 'Piazza della Città Vecchia', description: 'Cuore gotico di Praga: chiese, palazzi, mercatini di Natale indimenticabili.', duration: '1-2 ore', image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200&q=80' }
      ],
      'vienna': [
        { id: '1', title: 'Palazzo di Schönbrunn', description: 'La Versailles asburgica: 1441 stanze, giardini imperiali, zoo più antico del mondo.', duration: '4-5 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1575818109795-46300558fec6?w=1200&q=80' },
        { id: '2', title: 'Opera di Vienna', description: 'Una delle opere più prestigiose: biglietti in piedi a 4€, dress code rigoroso.', duration: '3 ore', priceRange: '€-€€€€', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80' },
        { id: '3', title: 'Cattedrale di Santo Stefano', description: 'Il Duomo gotico con il tetto a mosaico di 230.000 tegole colorate.', duration: '1-2 ore', image: 'https://images.unsplash.com/photo-1575818109795-46300558fec6?w=1200&q=80' },
        { id: '4', title: 'Museo di Storia dell\'Arte', description: 'Bruegel, Vermeer, Raffaello in un edificio che è esso stesso un\'opera d\'arte.', duration: '3-4 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&q=80' },
        { id: '5', title: 'Naschmarkt', description: 'Mercato dal 1780: spezie, olive, formaggi, vini e brunch leggendari.', duration: '2 ore', image: 'https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=1200&q=80' }
      ],
      'reykjavik': [
        { id: '1', title: 'Hallgrímskirkja', description: 'Chiesa luterana che sembra un razzo: design ispirato alle colonne basaltiche islandesi.', duration: '1 ora', priceRange: '€', image: 'https://images.unsplash.com/photo-1535449084-0d5a35fa8e1b?w=1200&q=80' },
        { id: '2', title: 'Blue Lagoon', description: 'Spa geotermica nell\'acqua lattiginosa azzurra a 38°C tra i campi di lava.', duration: '3-4 ore', priceRange: '€€€', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80' },
        { id: '3', title: 'Golden Circle', description: 'Tour classico: Þingvellir (placche tettoniche), Geysir, cascata Gullfoss.', duration: '8 ore', image: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&q=80' },
        { id: '4', title: 'Aurora Boreale', description: 'Da settembre a marzo: caccia alle luci del nord lontano dalla città.', duration: '4-5 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&q=80' },
        { id: '5', title: 'Harpa Concert Hall', description: 'Architettura contemporanea: facciata di 10.000 pannelli di vetro colorato.', duration: '1 ora', image: 'https://images.unsplash.com/photo-1519974719765-e6559eac2579?w=1200&q=80' }
      ],
      'athens': [
        { id: '1', title: 'Acropoli', description: 'Il Partenone domina la città da 2500 anni: simbolo della civiltà occidentale.', duration: '3-4 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a92?w=1200&q=80' },
        { id: '2', title: 'Museo dell\'Acropoli', description: 'I tesori del Partenone (quelli non portati via da Lord Elgin) in un museo moderno.', duration: '2-3 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a92?w=1200&q=80' },
        { id: '3', title: 'Plaka', description: 'Il quartiere più antico: taverne, bouzouki, negozi di sandali e gatti ovunque.', duration: '3-4 ore', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80' },
        { id: '4', title: 'Agorà Antica', description: 'La piazza dove nacque la democrazia: filosofi, mercanti e politici qui dibattevano.', duration: '2 ore', priceRange: '€', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80' },
        { id: '5', title: 'Monastiraki', description: 'Il mercato delle pulci di Atene: antichità, vintage e souvlaki per strada.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80' }
      ],
      'florence': [
        { id: '1', title: 'Galleria degli Uffizi', description: 'Botticelli, Leonardo, Michelangelo, Caravaggio: il Rinascimento in un edificio.', duration: '4-5 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&q=80' },
        { id: '2', title: 'Duomo di Firenze', description: 'La cupola di Brunelleschi: 463 gradini per la vista più bella della città.', duration: '2-3 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a92?w=1200&q=80' },
        { id: '3', title: 'Galleria dell\'Accademia', description: 'Il David di Michelangelo: 5 metri di perfezione marmorea che toglie il fiato.', duration: '2 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&q=80' },
        { id: '4', title: 'Ponte Vecchio', description: 'Il ponte medievale con le botteghe degli orafi: romantico al tramonto.', duration: '1 ora', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a92?w=1200&q=80' },
        { id: '5', title: 'Palazzo Pitti e Giardino di Boboli', description: 'La reggia dei Medici con giardini all\'italiana che dominano la città.', duration: '3-4 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&q=80' }
      ],
      'santorini': [
        { id: '1', title: 'Oia al tramonto', description: 'Il tramonto più fotografato del mondo: cupole blu, case bianche, sole che si tuffa.', duration: '2-3 ore' },
        { id: '2', title: 'Fira', description: 'Il capoluogo arroccato sulla caldera: shopping, musei, vista vertiginosa.', duration: '3-4 ore' },
        { id: '3', title: 'Red Beach', description: 'Spiaggia con scogliere rosse di lava: paesaggio marziano nel Mediterraneo.', duration: '2-3 ore' },
        { id: '4', title: 'Akrotiri', description: 'La Pompei greca: città minoica sepolta 3600 anni fa da un\'eruzione.', duration: '2 ore', priceRange: '€' },
        { id: '5', title: 'Cantine di Santorini', description: 'Degustazione di Assyrtiko vulcanico con vista sulla caldera.', duration: '3 ore', priceRange: '€€' }
      ],
      'dubrovnik': [
        { id: '1', title: 'Mura di Dubrovnik', description: 'Passeggiata di 2 km sulle mura medievali: vista sul mare e sui tetti rossi.', duration: '2-3 ore', priceRange: '€€' },
        { id: '2', title: 'Stradun', description: 'La via principale di marmo lucido: caffè, shopping, passeggio serale.', duration: '1-2 ore' },
        { id: '3', title: 'Lokrum Island', description: 'Isola paradisiaca a 10 minuti di barca: nudisti, pavoni, Game of Thrones.', duration: '4 ore', priceRange: '€' },
        { id: '4', title: 'Cable Car', description: 'Funivia al Monte Srđ: panorama a 360° sulla città e le isole Elafiti.', duration: '1-2 ore', priceRange: '€€' },
        { id: '5', title: 'Kayak al tramonto', description: 'Pagaiare intorno alle mura mentre il sole tramonta sul mare.', duration: '2-3 ore', priceRange: '€€' }
      ],
      // ===== AFRICA =====
      'marrakech': [
        { id: '1', title: 'Piazza Jemaa el-Fna', description: 'Il cuore pulsante: incantatori di serpenti, acrobati, bancarelle di cibo fumante.', duration: '3-4 ore' },
        { id: '2', title: 'Souk della Medina', description: 'Labirinto di 20.000 botteghe: spezie, tappeti, lanterne, contrattazione obbligatoria.', duration: '3-4 ore' },
        { id: '3', title: 'Palazzo Bahia', description: 'Capolavoro dell\'architettura marocchina: mosaici, legno di cedro, giardini.', duration: '1-2 ore', priceRange: '€' },
        { id: '4', title: 'Jardin Majorelle', description: 'Il giardino blu di Yves Saint Laurent: cactus, bouganville, museo berbero.', duration: '1-2 ore', priceRange: '€€' },
        { id: '5', title: 'Hammam tradizionale', description: 'Bagno turco marocchino con gommage: rito di purificazione millenario.', duration: '2 ore', priceRange: '€-€€€' }
      ],
      'capetown': [
        { id: '1', title: 'Table Mountain', description: 'Funivia rotante fino ai 1085 metri: vista su due oceani e tutta la penisola.', duration: '3-4 ore', priceRange: '€€' },
        { id: '2', title: 'Boulders Beach', description: 'Spiaggia con colonia di 3000 pinguini africani: nuota con loro!', duration: '2 ore', priceRange: '€' },
        { id: '3', title: 'Cape of Good Hope', description: 'Il punto più a sud-ovest dell\'Africa: paesaggi drammatici, babbuini curiosi.', duration: '6-8 ore' },
        { id: '4', title: 'Robben Island', description: 'Dove Nelson Mandela fu imprigionato 18 anni: tour con ex-detenuti.', duration: '4 ore', priceRange: '€€' },
        { id: '5', title: 'Bo-Kaap', description: 'Quartiere colorato malese-musulmano: case pastello e cucina Cape Malay.', duration: '2 ore' },
        { id: '6', title: 'Winelands', description: 'Degustazioni tra i migliori vini del Nuovo Mondo: Stellenbosch, Franschhoek.', duration: '1 giorno', priceRange: '€€' }
      ],
      'cairo': [
        { id: '1', title: 'Piramidi di Giza', description: 'L\'unica delle Sette Meraviglie rimasta: 4500 anni di mistero che svettano nel deserto.', duration: '4-5 ore', priceRange: '€€' },
        { id: '2', title: 'Sfinge', description: 'Il leone con testa umana che guarda l\'alba da millenni: 73 metri di enigma.', duration: '1 ora' },
        { id: '3', title: 'Museo Egizio', description: 'I tesori di Tutankhamon, mummie reali e 120.000 reperti in un edificio storico.', duration: '4-5 ore', priceRange: '€' },
        { id: '4', title: 'Khan el-Khalili', description: 'Il bazar medievale: oro, spezie, artigianato in un labirinto di 500 anni.', duration: '3-4 ore' },
        { id: '5', title: 'Crociera sul Nilo', description: 'Feluca al tramonto: il fiume sacro visto come gli antichi faraoni.', duration: '2-3 ore', priceRange: '€' }
      ],
      'zanzibar': [
        { id: '1', title: 'Stone Town', description: 'Centro storico UNESCO: labirinto di vicoli, porte scolpite, palazzo dei sultani.', duration: '4-5 ore' },
        { id: '2', title: 'Spiagge della costa est', description: 'Nungwi, Kendwa, Paje: sabbia bianca, acqua turchese, kitesurf.', duration: '1 giorno' },
        { id: '3', title: 'Spice Tour', description: 'Piantagioni di vaniglia, chiodi di garofano, cannella: l\'isola delle spezie.', duration: '4 ore', priceRange: '€' },
        { id: '4', title: 'Prison Island', description: 'Tartarughe giganti centenarie in un\'ex prigione: nuota con i pesci tropicali.', duration: '4 ore', priceRange: '€€' },
        { id: '5', title: 'The Rock Restaurant', description: 'Ristorante su uno scoglio raggiungibile a piedi con la bassa marea.', duration: '2-3 ore', priceRange: '€€€' }
      ],
      // ===== NORD AMERICA =====
      'newyork': [
        { id: '1', title: 'Statua della Libertà', description: 'Lady Liberty accoglie il mondo dal 1886: corona accessibile con prenotazione.', duration: '4 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200&q=80' },
        { id: '2', title: 'Central Park', description: '341 ettari di verde: il polmone di Manhattan con zoo, lago e Strawberry Fields.', duration: '3-4 ore', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=80' },
        { id: '3', title: 'Times Square', description: 'L\'incrocio più famoso del mondo: neon, Broadway, l\'America che non dorme.', duration: '1-2 ore', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=80' },
        { id: '4', title: 'Metropolitan Museum', description: 'Uno dei musei più grandi del mondo: 2 milioni di opere su 5000 anni.', duration: '5-6 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1575223970966-76ae61ee7838?w=1200&q=80' },
        { id: '5', title: 'Brooklyn Bridge', description: 'Attraversa a piedi il ponte iconico: vista sullo skyline al tramonto.', duration: '1 ora', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80' },
        { id: '6', title: '9/11 Memorial', description: 'Due piscine dove sorgevano le Torri Gemelle: omaggio toccante alle vittime.', duration: '2 ore', image: 'https://images.unsplash.com/photo-1534270804882-6b5048b1c1fc?w=1200&q=80' }
      ],
      'losangeles': [
        { id: '1', title: 'Hollywood Walk of Fame', description: '2600+ stelle sui marciapiedi: cerca quelle dei tuoi divi preferiti.', duration: '2 ore' },
        { id: '2', title: 'Griffith Observatory', description: 'Vista gratuita su LA e la scritta Hollywood: tramonto indimenticabile.', duration: '2-3 ore' },
        { id: '3', title: 'Santa Monica Pier', description: 'Il molo iconico: ruota panoramica, Route 66 endpoint, musclemen.', duration: '2-3 ore' },
        { id: '4', title: 'Venice Beach', description: 'Boardwalk della controcultura: skater, artisti, Muscle Beach, canali nascosti.', duration: '3-4 ore' },
        { id: '5', title: 'Universal Studios', description: 'Parco a tema dietro le quinte: Wizarding World, Jurassic, Studio Tour.', duration: '1 giorno', priceRange: '€€€' },
        { id: '6', title: 'Getty Center', description: 'Arte e architettura sulla collina: Van Gogh, giardini, vista su LA. Gratis!', duration: '3-4 ore' }
      ],
      'sanfrancisco': [
        { id: '1', title: 'Golden Gate Bridge', description: 'Iconico ponte rosso (in realtà arancione internazionale): cammina i suoi 2.7 km.', duration: '1-2 ore' },
        { id: '2', title: 'Alcatraz', description: 'L\'isola-prigione dei gangster: audio tour narrato da ex-detenuti. Prenota!', duration: '3-4 ore', priceRange: '€€' },
        { id: '3', title: 'Cable Cars', description: 'I tram a cavo più antichi del mondo ancora in funzione: aggrappati e parti!', duration: '30 min-1 ora', priceRange: '€' },
        { id: '4', title: 'Fisherman\'s Wharf', description: 'Il porto turistico: leoni marini al Pier 39, clam chowder nel pane.', duration: '2-3 ore' },
        { id: '5', title: 'Painted Ladies', description: 'Le case vittoriane colorate più fotografate: vista da Alamo Square.', duration: '1 ora' },
        { id: '6', title: 'Chinatown', description: 'La Chinatown più antica del Nord America: dim sum e souvenir kitsch.', duration: '2-3 ore' }
      ],
      'miami': [
        { id: '1', title: 'South Beach & Ocean Drive', description: 'Art Deco pastello, palme, modelle: il set di Miami Vice dal vivo.', duration: '3-4 ore' },
        { id: '2', title: 'Wynwood Walls', description: 'Street art museum a cielo aperto: murales giganti che cambiano spesso.', duration: '2-3 ore' },
        { id: '3', title: 'Little Havana', description: 'Cuba in esilio: domino al parco, sigari arrotolati a mano, mojito perfetti.', duration: '3 ore' },
        { id: '4', title: 'Everglades', description: 'Airboat tra gli alligatori: ecosistema unico di paludi tropicali.', duration: '4-5 ore', priceRange: '€€' },
        { id: '5', title: 'Key Biscayne', description: 'Fuga dall\'urban: spiagge selvagge e il faro più antico della Florida.', duration: '4 ore' }
      ],
      'vancouver': [
        { id: '1', title: 'Stanley Park', description: '405 ettari di foresta pluviale: Seawall, totem, acquario, spiagge.', duration: '3-4 ore' },
        { id: '2', title: 'Capilano Suspension Bridge', description: 'Ponte sospeso a 70 metri sopra il canyon nella foresta: brivido garantito.', duration: '3 ore', priceRange: '€€' },
        { id: '3', title: 'Granville Island', description: 'Ex zona industriale: mercato alimentare, birrifici artigianali, artisti.', duration: '3-4 ore' },
        { id: '4', title: 'Grouse Mountain', description: 'La cima di Vancouver: skyride, orsi grizzly, sci in inverno.', duration: '4 ore', priceRange: '€€' },
        { id: '5', title: 'Gastown', description: 'Quartiere storico vittoriano: l\'orologio a vapore, cocktail bar, vintage.', duration: '2-3 ore' }
      ],
      'mexicocity': [
        { id: '1', title: 'Museo Nacional de Antropología', description: 'Il più grande museo dell\'America Latina: la Piedra del Sol azteca.', duration: '4-5 ore', priceRange: '€' },
        { id: '2', title: 'Zócalo', description: 'Una delle piazze più grandi del mondo: Cattedrale, Palacio Nacional, murales di Rivera.', duration: '2-3 ore' },
        { id: '3', title: 'Teotihuacán', description: 'Le piramidi del Sole e della Luna: misteriosa città pre-azteca a 1 ora da CDMX.', duration: '6 ore', priceRange: '€€' },
        { id: '4', title: 'Xochimilco', description: 'I giardini galleggianti azteci: barca colorata, mariachi, birra, caos gioioso.', duration: '4-5 ore', priceRange: '€' },
        { id: '5', title: 'Casa Azul (Museo Frida Kahlo)', description: 'Dove Frida nacque e morì: le sue opere, i suoi abiti, il suo mondo.', duration: '2 ore', priceRange: '€' },
        { id: '6', title: 'Coyoacán', description: 'Il quartiere bohémien: librerie, caffè, la casa di Trotsky, mercato.', duration: '3-4 ore' }
      ],
      // ===== SUD AMERICA =====
      'buenosaires': [
        { id: '1', title: 'La Boca & Caminito', description: 'Case di lamiera colorata, tango per strada, la Bombonera del Boca Juniors.', duration: '2-3 ore' },
        { id: '2', title: 'Recoleta Cemetery', description: 'Il cimitero più elegante del mondo: Evita riposa qui tra mausolei Liberty.', duration: '2 ore' },
        { id: '3', title: 'Teatro Colón', description: 'Tra i 5 teatri d\'opera più importanti: acustica perfetta, lusso europeo.', duration: '1-2 ore', priceRange: '€-€€€' },
        { id: '4', title: 'San Telmo', description: 'Mercatino domenicale dell\'antiquariato, tango nelle strade, caffè storici.', duration: '3-4 ore' },
        { id: '5', title: 'MALBA', description: 'Museo di arte latinoamericana: Frida, Diego Rivera, arte contemporanea.', duration: '2-3 ore', priceRange: '€' },
        { id: '6', title: 'Palermo Soho', description: 'Quartiere trendy: boutique di design, brunch, vita notturna, parchi.', duration: '3-4 ore' }
      ],
      'riodejaneiro': [
        { id: '1', title: 'Cristo Redentore', description: 'Una delle Nuove Sette Meraviglie: 38 metri che abbracciano Rio dal Corcovado.', duration: '3-4 ore', priceRange: '€€' },
        { id: '2', title: 'Pão de Açúcar', description: 'Due funivie per il Pan di Zucchero: vista a 360° su Rio e le spiagge.', duration: '3 ore', priceRange: '€€' },
        { id: '3', title: 'Copacabana', description: 'La spiaggia più famosa del mondo: 4 km di sabbia, caipirinha, altinha (footvolley).', duration: '4 ore' },
        { id: '4', title: 'Ipanema', description: 'La spiaggia della canzone: al tramonto vai alla Pedra do Arpoador.', duration: '4 ore' },
        { id: '5', title: 'Escadaria Selarón', description: '215 gradini rivestiti di piastrelle da 60 paesi: l\'ossessione di Jorge Selarón.', duration: '1 ora' },
        { id: '6', title: 'Santa Teresa', description: 'Quartiere bohémien sulla collina: strade acciottolate, gallerie, samba.', duration: '2-3 ore' }
      ],
      'cusco': [
        { id: '1', title: 'Machu Picchu', description: 'La città perduta degli Inca a 2430m: treno o trekking dell\'Inca Trail.', duration: '1 giorno', priceRange: '€€€' },
        { id: '2', title: 'Plaza de Armas', description: 'Il cuore coloniale costruito sulle fondamenta inca: Cattedrale, Compañía.', duration: '1-2 ore' },
        { id: '3', title: 'Sacsayhuamán', description: 'Fortezza inca con massi di 200 tonnellate incastrati senza malta.', duration: '2 ore', priceRange: '€' },
        { id: '4', title: 'Valle Sacra', description: 'Ollantaytambo, Pisac, Moray: rovine inca tra montagne andine mozzafiato.', duration: '1 giorno', priceRange: '€€' },
        { id: '5', title: 'San Pedro Market', description: 'Mercato locale: succhi, ceviche, foglie di coca, artigianato a prezzi veri.', duration: '2 ore' }
      ],
      'cartagena': [
        { id: '1', title: 'Ciudad Amurallada', description: 'Centro storico UNESCO: mura del XVI secolo, balconi fioriti, colori pastello.', duration: '4-5 ore' },
        { id: '2', title: 'Castillo San Felipe', description: 'La più grande fortezza spagnola nelle Americhe: tunnel, labirinti, vista.', duration: '2 ore', priceRange: '€' },
        { id: '3', title: 'Getsemaní', description: 'Quartiere trendy fuori mura: street art, ostelli, vita notturna, autentico.', duration: '2-3 ore' },
        { id: '4', title: 'Islas del Rosario', description: 'Arcipelago corallino a 45 min: snorkeling, spiagge deserte, pesce fresco.', duration: '1 giorno', priceRange: '€€' },
        { id: '5', title: 'Café Havana', description: 'Il bar di salsa più famoso: balla con i locali fino all\'alba.', duration: '4 ore', priceRange: '€' }
      ],
      // ===== OCEANIA =====
      'sydney': [
        { id: '1', title: 'Sydney Opera House', description: 'Capolavoro di Utzon patrimonio UNESCO: visita guidata o meglio, assisti a uno spettacolo.', duration: '2-3 ore', priceRange: '€-€€€', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80' },
        { id: '2', title: 'Harbour Bridge', description: 'Arrampicati sulla "gruccia" per la vista: BridgeClimb è un\'esperienza unica.', duration: '3 ore', priceRange: '€€€', image: 'https://images.unsplash.com/photo-1524293581917-878a6d017c71?w=1200&q=80' },
        { id: '3', title: 'Bondi Beach', description: 'La spiaggia più iconica d\'Australia: surf, Icebergs Pool, Bondi to Coogee walk.', duration: '4 ore', image: 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1200&q=80' },
        { id: '4', title: 'The Rocks', description: 'Il quartiere più antico: mercatini del weekend, pub storici, street art.', duration: '2-3 ore', image: 'https://images.unsplash.com/photo-1528072164453-f4e8ef0d475a?w=1200&q=80' },
        { id: '5', title: 'Taronga Zoo', description: 'Zoo con vista sull\'Opera: koala, canguri, ornitorinco. Arriva in traghetto!', duration: '4 ore', priceRange: '€€', image: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?w=1200&q=80' }
      ],
      'melbourne': [
        { id: '1', title: 'Laneways & Street Art', description: 'Hosier Lane, AC/DC Lane: labirinto di vicoli pieni di graffiti e caffè nascosti.', duration: '3-4 ore' },
        { id: '2', title: 'Queen Victoria Market', description: 'Dal 1878: prodotti freschi, deli europei, vintage, cibo di strada.', duration: '2-3 ore' },
        { id: '3', title: 'Great Ocean Road', description: 'I 12 Apostoli e scogliere spettacolari: il road trip più scenico d\'Australia.', duration: '1-2 giorni', priceRange: '€€' },
        { id: '4', title: 'Royal Botanic Gardens', description: '38 ettari di giardini vittoriani: pipistrelli giganti al tramonto!', duration: '2-3 ore' },
        { id: '5', title: 'NGV (National Gallery of Victoria)', description: 'La più antica e grande galleria d\'Australia: ingresso gratuito.', duration: '2-3 ore' }
      ],
      'queenstown': [
        { id: '1', title: 'Bungee Jumping al Kawarau Bridge', description: 'Dove è nato il bungee commerciale: 43 metri di volo libero.', duration: '3 ore', priceRange: '€€€' },
        { id: '2', title: 'Milford Sound', description: 'Il fiordo più spettacolare: crociera tra cascate, foche, delfini.', duration: '8-12 ore', priceRange: '€€€' },
        { id: '3', title: 'Skyline Gondola', description: 'Funivia con vista sulle Remarkables: poi luge downhill adrenalinico.', duration: '3 ore', priceRange: '€€' },
        { id: '4', title: 'Jet Boat sul Shotover River', description: '85 km/h tra canyon stretti: il pilota sfiora le rocce apposta.', duration: '1 ora', priceRange: '€€€' },
        { id: '5', title: 'Fergburger', description: 'Il burger più famoso della Nuova Zelanda: code di 30 minuti, aperto fino a tardi.', duration: '1 ora', priceRange: '€' }
      ],
      'fiji': [
        { id: '1', title: 'Mamanuca Islands', description: 'L\'arcipelago di Castaway: spiagge da cartolina, resort sull\'acqua.', duration: '1+ giorni', priceRange: '€€€' },
        { id: '2', title: 'Snorkeling & Diving', description: 'Barriera corallina morbida, mante giganti, squali (amichevoli): il top mondiale.', duration: '4-6 ore', priceRange: '€€' },
        { id: '3', title: 'Cloud 9', description: 'Piattaforma galleggiante in mezzo all\'oceano: bar, DJ, prendisole.', duration: '4 ore', priceRange: '€€' },
        { id: '4', title: 'Villaggio Fijiano', description: 'Visita tradizionale con cerimonia della kava: cultura autentica.', duration: '4 ore', priceRange: '€' },
        { id: '5', title: 'Garden of the Sleeping Giant', description: '2000 varietà di orchidee ai piedi della catena montuosa.', duration: '2 ore', priceRange: '€' }
      ]
    };
    return items[cityId] || [
      { id: '1', title: 'Centro Storico', description: 'Il cuore pulsante della città.', duration: '2-3 ore' },
      { id: '2', title: 'Museo Principale', description: 'Collezioni che raccontano la storia locale.', duration: '2 ore' }
    ];
  }

  private generateEatItems(cityId: string): SectionItem[] {
    const items: Record<string, SectionItem[]> = {
      // ===== ASIA =====
      'tokyo': [
        { id: 'e1', title: 'Ramen a Shinjuku', description: 'Omoide Yokocho: vicoli fumosi pieni di izakaya con ramen tonkotsu cremoso.', priceRange: '€', location: 'Shinjuku', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1200&q=80' },
        { id: 'e2', title: 'Sushi al Tsukiji Outer Market', description: 'Il pesce più fresco del mondo servito all\'alba. Prova l\'omakase!', priceRange: '€€', location: 'Tsukiji', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&q=80' },
        { id: 'e3', title: 'Kaiseki a Ginza', description: 'Alta cucina giapponese stagionale: ogni portata è un\'opera d\'arte.', priceRange: '€€€€', location: 'Ginza', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80' },
        { id: 'e4', title: 'Street food a Yanaka', description: 'Quartiere vecchia Tokyo: senbei artigianali, taiyaki, mochi appena fatto.', priceRange: '€', location: 'Yanaka', image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&q=80' },
        { id: 'e5', title: 'Tempura Kondo', description: '2 stelle Michelin: la tempura leggera come aria, croccante come vetro.', priceRange: '€€€€', location: 'Ginza', image: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=1200&q=80' }
      ],
      'kyoto': [
        { id: 'e1', title: 'Kaiseki tradizionale', description: 'La cucina dei monaci zen: estetica, stagionalità, ingredienti locali.', priceRange: '€€€-€€€€', location: 'Gion', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80' },
        { id: 'e2', title: 'Nishiki Market', description: 'La cucina di Kyoto: 400 anni di bancarelle con cibi da assaggiare.', priceRange: '€', location: 'Centro', image: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1200&q=80' },
        { id: 'e3', title: 'Matcha e wagashi', description: 'Cerimonia del tè con dolci tradizionali: esperienza meditativa.', priceRange: '€€', location: 'Gion', image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&q=80' },
        { id: 'e4', title: 'Tofu di Nanzenji', description: 'Tofu artigianale cucinato in mille modi: specialità kyotoita.', priceRange: '€€', location: 'Nanzenji', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80' }
      ],
      'bali': [
        { id: 'e1', title: 'Warung locale', description: 'Nasi goreng, mie goreng, satay a pochi euro: la vera cucina balinese.', priceRange: '€', location: 'Ovunque', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80' },
        { id: 'e2', title: 'Babi Guling (maialino arrosto)', description: 'Il piatto balinese per eccellenza: ibu Oka a Ubud è leggendaria.', priceRange: '€', location: 'Ubud', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e3', title: 'Smoothie bowl a Canggu', description: 'Capitale mondiale dell\'healthy food: acai, pitaya, granola homemade.', priceRange: '€', location: 'Canggu', image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=1200&q=80' },
        { id: 'e4', title: 'Bebek betutu', description: 'Anatra ripiena di spezie, cotta per ore avvolta in foglie di banano.', priceRange: '€€', location: 'Ubud', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' }
      ],
      'bangkok': [
        { id: 'e1', title: 'Pad Thai di Thip Samai', description: 'La leggenda del pad thai: code di 1 ora, ne vale ogni minuto.', priceRange: '€', location: 'Old Town', image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=1200&q=80' },
        { id: 'e2', title: 'Street food a Yaowarat (Chinatown)', description: 'Il paradiso notturno: dim sum, granchi al pepe, frutti di mare fumanti.', priceRange: '€', location: 'Chinatown', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' },
        { id: 'e3', title: 'Jay Fai (1 stella Michelin)', description: 'Nonna con occhialoni che cucina il miglior crab omelette del mondo.', priceRange: '€€€', location: 'Old Town', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e4', title: 'Som Tam (insalata di papaya)', description: 'Piccante, acido, dolce, salato: il perfetto equilibrio thai.', priceRange: '€', location: 'Ovunque', image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=1200&q=80' },
        { id: 'e5', title: 'Rooftop bar con vista', description: 'Cocktail a 60 piani: Lebua (Hangover 2), Banyan Tree, Octave.', priceRange: '€€€', location: 'Silom/Sathorn', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80' }
      ],
      'singapore': [
        { id: 'e1', title: 'Hawker Chan (1 stella Michelin)', description: 'Il cibo di strada più economico stellato: soya chicken rice a 3€.', priceRange: '€', location: 'Chinatown Complex', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80' },
        { id: 'e2', title: 'Chili Crab a Jumbo', description: 'Il piatto nazionale: granchio in salsa chili dolce-piccante. Mantou per intingere!', priceRange: '€€€', location: 'Clarke Quay', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&q=80' },
        { id: 'e3', title: 'Lau Pa Sat Hawker Center', description: 'Centro food vittoriano: satay street si accende la sera.', priceRange: '€', location: 'CBD', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' },
        { id: 'e4', title: 'Din Tai Fung', description: 'I migliori xiaolongbao del mondo: 18 pieghe, brodo perfetto.', priceRange: '€€', location: 'Vari', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80' },
        { id: 'e5', title: 'Indian food a Little India', description: 'Banana leaf rice, roti prata, fish head curry: India autentica.', priceRange: '€', location: 'Little India', image: 'https://images.unsplash.com/photo-1583573636246-18cb2246697f?w=1200&q=80' }
      ],
      'seoul': [
        { id: 'e1', title: 'Korean BBQ a Mapo', description: 'Griglia sul tavolo, soju che scorre, ssam wrap con kimchi.', priceRange: '€€', location: 'Mapo-gu', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e2', title: 'Myeongdong street food', description: 'Tornado potato, tteokbokki, hotteok: food walk infinito.', priceRange: '€', location: 'Myeongdong', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' },
        { id: 'e3', title: 'Jjimdak a Andong', description: 'Pollo brasato con noodles di vetro: comfort food coreano.', priceRange: '€', location: 'Vari', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e4', title: 'Fried Chicken & Beer', description: 'Chimaek (chicken + maekju): rituale notturno coreano imperdibile.', priceRange: '€', location: 'Hongdae', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e5', title: 'Temple food', description: 'Cucina vegetariana buddista: 1000 anni di sapienza in ogni piatto.', priceRange: '€€', location: 'Insadong', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80' }
      ],
      'hanoi': [
        { id: 'e1', title: 'Phở a Phở Thìn', description: 'La zuppa nazionale: brodo di 12 ore, manzo tenero, erbe fresche.', priceRange: '€', location: 'Old Quarter', image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=1200&q=80' },
        { id: 'e2', title: 'Bún Chả', description: 'Il piatto che Obama mangiò con Bourdain: maiale grigliato, noodles, erbe.', priceRange: '€', location: 'Bun Cha Huong Lien', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e3', title: 'Egg coffee (Cà Phê Trứng)', description: 'Caffè con crema di uovo: invenzione hanoiana degli anni \'40.', priceRange: '€', location: 'Giang Café', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80' },
        { id: 'e4', title: 'Bánh mì', description: 'La baguette vietnamita: fusione perfetta Francia-Vietnam.', priceRange: '€', location: 'Ovunque', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&q=80' }
      ],
      'dubai': [
        { id: 'e1', title: 'Al Fanar', description: 'Cucina emiratina autentica: machboos, harees, luqaimat.', priceRange: '€€', location: 'Festival City', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e2', title: 'Brunch del venerdì', description: 'Tradizione di Dubai: all-you-can-eat gourmet con champagne.', priceRange: '€€€€', location: 'Hotel 5 stelle', image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&q=80' },
        { id: 'e3', title: 'Ravi Restaurant', description: 'Pakistani economico: curry di capra, biryani, naan. Cult dal 1978.', priceRange: '€', location: 'Satwa', image: 'https://images.unsplash.com/photo-1583573636246-18cb2246697f?w=1200&q=80' },
        { id: 'e4', title: 'At.mosphere', description: 'Ristorante al 122° piano del Burj Khalifa: mangia sopra le nuvole.', priceRange: '€€€€', location: 'Burj Khalifa', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80' }
      ],
      // ===== EUROPA =====
      'lisbon': [
        { id: 'e1', title: 'Pastéis de Belém', description: 'L\'originale pastel de nata dal 1837: crema, sfoglia, zucchero a velo.', priceRange: '€', location: 'Belém', image: 'https://images.unsplash.com/photo-1511861621813-e4c3f6dfc622?w=1200&q=80' },
        { id: 'e2', title: 'Time Out Market', description: 'Food hall con i migliori chef portoghesi: assaggia tutto!', priceRange: '€€', location: 'Cais do Sodré', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' },
        { id: 'e3', title: 'Cervejaria Ramiro', description: 'Frutti di mare alla griglia: gamberi, percebes, santola. Prenota!', priceRange: '€€€', location: 'Intendente', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&q=80' },
        { id: 'e4', title: 'Tascas in Alfama', description: 'Trattorie a gestione familiare: bacalhau, bifana, ginjinha.', priceRange: '€', location: 'Alfama', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' }
      ],
      'barcelona': [
        { id: 'e1', title: 'Mercato de la Boqueria', description: 'Paradiso gastronomico dal 1217: frutti di mare, jamón, succhi freschi.', priceRange: '€-€€', location: 'La Rambla', image: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1200&q=80' },
        { id: 'e2', title: 'Tapas al Barri Gòtic', description: 'Bar Cañete, Quimet y Quimet: patatas bravas, croquetas, anchoas.', priceRange: '€€', location: 'Barri Gòtic', image: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=1200&q=80' },
        { id: 'e3', title: 'Paella a Barceloneta', description: 'La paella sul mare: Can Paixano per cava e tapas, Can Majó per paella.', priceRange: '€€', location: 'Barceloneta', image: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=1200&q=80' },
        { id: 'e4', title: 'Tickets (Albert Adrià)', description: 'Tapas creative del fratello di Ferran: esperienza stellata giocosa.', priceRange: '€€€€', location: 'Poble Sec', image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=1200&q=80' }
      ],
      'paris': [
        { id: 'e1', title: 'Croissant da Du Pain et des Idées', description: 'La boulangerie più fotogenica: pain des amis, escargot pistache.', priceRange: '€', location: 'Canal Saint-Martin', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&q=80' },
        { id: 'e2', title: 'Bistrot classico', description: 'Steak frites, coq au vin, crème brûlée: Le Comptoir, Chez l\'Ami Jean.', priceRange: '€€-€€€', location: 'Saint-Germain', image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&q=80' },
        { id: 'e3', title: 'Formaggi da Fromagerie Laurent Dubois', description: 'MOF (Migliori Artigiani di Francia): 200 formaggi affinati.', priceRange: '€€', location: 'Maubert', image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=1200&q=80' },
        { id: 'e4', title: 'Café de Flore', description: 'Il caffè dove Sartre e Beauvoir scrivevano: caffè, croque-monsieur, storia.', priceRange: '€€', location: 'Saint-Germain', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80' },
        { id: 'e5', title: 'Rue Mouffetard food market', description: 'Mercato di quartiere storico: ostriche, crêpes, vino naturale.', priceRange: '€', location: '5ème', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=1200&q=80' }
      ],
      'rome': [
        { id: 'e1', title: 'Carbonara da Roscioli', description: 'La carbonara definitiva: guanciale, pecorino, uovo cremoso. Prenota!', priceRange: '€€', location: 'Centro', image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=1200&q=80' },
        { id: 'e2', title: 'Supplì a Trapizzino', description: 'Street food romano: supplì al telefono, trapizzino, fiori di zucca.', priceRange: '€', location: 'Testaccio', image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=1200&q=80' },
        { id: 'e3', title: 'Cacio e pepe a Felice a Testaccio', description: 'Tre ingredienti, perfezione assoluta: la preparano al tavolo.', priceRange: '€€', location: 'Testaccio', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1200&q=80' },
        { id: 'e4', title: 'Gelato da Giolitti', description: 'Dal 1900: crema, pistacchio, zabaione. I Papi venivano qui!', priceRange: '€', location: 'Centro', image: 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=1200&q=80' },
        { id: 'e5', title: 'Aperitivo a Trastevere', description: 'Spritz al tramonto sulle piazzette: Freni e Frizioni, Ma Che Siete Venuti a Fà.', priceRange: '€', location: 'Trastevere', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&q=80' }
      ],
      'amsterdam': [
        { id: 'e1', title: 'Stroopwafel fresco', description: 'Al mercato Albert Cuyp: waffle caldo con sciroppo che cola.', priceRange: '€', location: 'De Pijp', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&q=80' },
        { id: 'e2', title: 'Rijsttafel indonesiana', description: 'Eredità coloniale: 20+ piatti indonesiani in un pasto. Blauw è top.', priceRange: '€€', location: 'De Pijp', image: 'https://images.unsplash.com/photo-1583573636246-18cb2246697f?w=1200&q=80' },
        { id: 'e3', title: 'Haring crudo', description: 'Aringa marinata con cipolla e cetriolini: street food olandese iconico.', priceRange: '€', location: 'Ovunque', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' },
        { id: 'e4', title: 'Foodhallen', description: 'Ex deposito tram ora food court trendy: bitterballen, pulled pork, poké.', priceRange: '€€', location: 'Oud-West', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' }
      ],
      'prague': [
        { id: 'e1', title: 'Svíčková na smetaně', description: 'Manzo marinato con salsa alla panna, knedlíky e mirtilli.', priceRange: '€', location: 'Lokal', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e2', title: 'Trdelník', description: 'Dolce a camino caramellato: tourist trap ma irresistibile con gelato.', priceRange: '€', location: 'Ovunque', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&q=80' },
        { id: 'e3', title: 'Birra ceca nei pivnice', description: 'Pilsner Urquell, Budvar alla spina: la migliore birra del mondo a 2€.', priceRange: '€', location: 'U Zlatého Tygra', image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200&q=80' },
        { id: 'e4', title: 'Smažený sýr', description: 'Formaggio fritto con maionese e patatine: guilty pleasure praghese.', priceRange: '€', location: 'Ovunque', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' }
      ],
      'vienna': [
        { id: 'e1', title: 'Sachertorte al Hotel Sacher', description: 'La torta al cioccolato originale dal 1832: umida, non troppo dolce.', priceRange: '€€', location: 'Centro', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&q=80' },
        { id: 'e2', title: 'Wiener Schnitzel', description: 'Cotoletta di vitello battuta sottile, fritta nel burro: Figlmüller fa 30cm!', priceRange: '€€', location: 'Centro', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e3', title: 'Kaffeehäuser', description: 'Café Central, Sperl: ordina un Melange, leggi il giornale per ore.', priceRange: '€€', location: 'Centro', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80' },
        { id: 'e4', title: 'Naschmarkt', description: 'Mercato dal 1780: spezie, olive, hummus, brunch internazionale.', priceRange: '€-€€', location: 'Naschmarkt', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' }
      ],
      'reykjavik': [
        { id: 'e1', title: 'Hot dog da Bæjarins Beztu', description: 'Il miglior hot dog del mondo (parola di Clinton): agnello, remoulade, cipolla.', priceRange: '€', location: 'Centro', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' },
        { id: 'e2', title: 'Pesce del giorno', description: 'Merluzzo, salmone, balena: pescato freschissimo, preparazione semplice.', priceRange: '€€-€€€', location: 'Porto', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&q=80' },
        { id: 'e3', title: 'Þorramatur (cibo tradizionale)', description: 'Squalo fermentato (hákarl), testa di pecora: per i coraggiosi!', priceRange: '€€', location: 'Ristoranti tradizionali', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e4', title: 'Skyr', description: 'Yogurt islandese proteico: colazione nazionale, anche in gelato.', priceRange: '€', location: 'Ovunque', image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=1200&q=80' }
      ],
      'athens': [
        { id: 'e1', title: 'Souvlaki da O Kostas', description: 'Il miglior souvlaki di Atene: pita, tzatziki, pomodoro, cipolla. 2€.', priceRange: '€', location: 'Syntagma', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' },
        { id: 'e2', title: 'Taverna a Plaka', description: 'Moussaka, gemista, dolmades con retsina: cucina della nonna.', priceRange: '€', location: 'Plaka', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e3', title: 'Frutti di mare al Pireo', description: 'Polpo grigliato, sardine, calamari: vista mare, ouzo che scorre.', priceRange: '€€', location: 'Mikrolimano', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&q=80' },
        { id: 'e4', title: 'Loukoumades', description: 'Frittelle al miele: le ciambelle greche calde servite con cannella.', priceRange: '€', location: 'Monastiraki', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&q=80' }
      ],
      'florence': [
        { id: 'e1', title: 'Bistecca alla Fiorentina', description: '1.2 kg di Chianina al sangue: esperienza carnivora definitiva.', priceRange: '€€€', location: 'Trattoria Mario', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80' },
        { id: 'e2', title: 'Panino con il lampredotto', description: 'Trippa bollita nel panino: street food fiorentino DOC.', priceRange: '€', location: 'Mercato Centrale', image: 'https://images.unsplash.com/photo-1595295333158-4742f73f8e85?w=1200&q=80' },
        { id: 'e3', title: 'Mercato Centrale', description: 'Piano terra: prodotti freschi. Piano alto: food court gourmet.', priceRange: '€-€€', location: 'San Lorenzo', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' },
        { id: 'e4', title: 'Gelato da Vivoli', description: 'Dal 1929: crema, nocciola, stracciatella. I fiorentini vengono qui.', priceRange: '€', location: 'Santa Croce', image: 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=1200&q=80' }
      ],
      'santorini': [
        { id: 'e1', title: 'Fava santorini', description: 'Purea di legumi locali con cipolla caramellata e capperi: specialità unica.', priceRange: '€', location: 'Ovunque' },
        { id: 'e2', title: 'Tomatokeftedes', description: 'Frittelle di pomodori santorini (piccoli, dolcissimi): imperdibili.', priceRange: '€', location: 'Taverne' },
        { id: 'e3', title: 'Cena con vista caldera', description: 'Ambrosia, Lycabettus: piatti greci mentre il sole si tuffa.', priceRange: '€€€', location: 'Oia/Fira' },
        { id: 'e4', title: 'Wine tasting', description: 'Assyrtiko vulcanico nelle cantine storiche: Santo, Venetsanos.', priceRange: '€€', location: 'Cantine' }
      ],
      'dubrovnik': [
        { id: 'e1', title: 'Pesce fresco alla Konoba', description: 'Orata alla griglia, risotto nero, brudet: semplicità mediterranea.', priceRange: '€€', location: 'Città vecchia' },
        { id: 'e2', title: 'Peka', description: 'Carne o polpo cotti sotto la campana: piatto tradizionale dalmata.', priceRange: '€€', location: 'Ristoranti locali' },
        { id: 'e3', title: 'Gelato da Dolce Vita', description: 'Gelato artigianale con vista Stradun: gusti creativi mediterranei.', priceRange: '€', location: 'Stradun' },
        { id: 'e4', title: 'Cocktail al Buža Bar', description: 'Bar nascosto nel buco delle mura: drink con vista mare da brivido.', priceRange: '€€', location: 'Mura esterne' }
      ],
      // ===== AFRICA =====
      'marrakech': [
        { id: 'e1', title: 'Tagine a Jemaa el-Fna', description: 'Stufato berbero in coccio: agnello, prugne, mandorle, spezie.', priceRange: '€', location: 'Medina' },
        { id: 'e2', title: 'Street food alla piazza', description: 'Escargots piccanti, testa di pecora, succo d\'arancia fresco.', priceRange: '€', location: 'Jemaa el-Fna' },
        { id: 'e3', title: 'Pastilla', description: 'Torta sfogliata dolce-salata con piccione, mandorle, cannella.', priceRange: '€€', location: 'Ristoranti' },
        { id: 'e4', title: 'Tè alla menta', description: 'Rituale di ospitalità: versato dall\'alto tre volte, dolcissimo.', priceRange: '€', location: 'Ovunque' }
      ],
      'capetown': [
        { id: 'e1', title: 'Braai (BBQ sudafricano)', description: 'Boerewors (salsicce), sosatie, pap: rituale sociale domenicale.', priceRange: '€€', location: 'Ovunque' },
        { id: 'e2', title: 'Cape Malay curry', description: 'Curry speziato della comunità malese di Bo-Kaap: bobotie, bredie.', priceRange: '€', location: 'Bo-Kaap' },
        { id: 'e3', title: 'Seafood a Hout Bay', description: 'Fish and chips freschissimo al porto: foche che chiedono l\'elemosina.', priceRange: '€', location: 'Hout Bay' },
        { id: 'e4', title: 'Wine tasting a Stellenbosch', description: 'Pinotage, Chenin Blanc: i migliori vini africani con vista vigneti.', priceRange: '€€', location: 'Winelands' }
      ],
      'cairo': [
        { id: 'e1', title: 'Kushari', description: 'Il piatto nazionale: pasta, riso, lenticchie, ceci, cipolla fritta, pomodoro.', priceRange: '€', location: 'Abou Tarek' },
        { id: 'e2', title: 'Ful medames', description: 'Fave stufate per colazione: l\'energia egiziana per iniziare.', priceRange: '€', location: 'Ovunque' },
        { id: 'e3', title: 'Kebab e kofta', description: 'Carne grigliata perfetta: Felfela è un\'istituzione dal 1959.', priceRange: '€', location: 'Centro' },
        { id: 'e4', title: 'Shisha sul Nilo', description: 'Narghilè, tè, dolci: relax egiziano guardando il fiume eterno.', priceRange: '€', location: 'Zamalek' }
      ],
      'zanzibar': [
        { id: 'e1', title: 'Zanzibar Mix', description: 'Street food notturno a Forodhani: spiedini, zanzibar pizza, seafood.', priceRange: '€', location: 'Stone Town' },
        { id: 'e2', title: 'Pesce alla griglia', description: 'Barracuda, red snapper, gamberi: pescato del giorno in spiaggia.', priceRange: '€€', location: 'Spiagge' },
        { id: 'e3', title: 'Curry swahili', description: 'Influenze arabe, indiane, africane: cocco, spezie, storia.', priceRange: '€', location: 'Stone Town' },
        { id: 'e4', title: 'Succo di canna da zucchero', description: 'Spremuto al momento con zenzero: energia tropicale istantanea.', priceRange: '€', location: 'Mercati' }
      ],
      // ===== NORD AMERICA =====
      'newyork': [
        { id: 'e1', title: 'Pizza a Brooklyn', description: 'Di Fara, L&B Spumoni, Lucali: la pizza slice che ha definito l\'America.', priceRange: '€', location: 'Brooklyn' },
        { id: 'e2', title: 'Bagel da Russ & Daughters', description: 'Bagel con lox (salmone) e cream cheese dal 1914: l\'appetizing perfetto.', priceRange: '€', location: 'Lower East Side' },
        { id: 'e3', title: 'Pastrami da Katz\'s Deli', description: '"I\'ll have what she\'s having" (When Harry Met Sally): qui da 1888.', priceRange: '€€', location: 'Lower East Side' },
        { id: 'e4', title: 'Dumplings a Chinatown', description: 'Joe\'s Shanghai, Nom Wah: i migliori dumpling fuori dall\'Asia.', priceRange: '€', location: 'Chinatown' },
        { id: 'e5', title: 'Fine dining a Manhattan', description: 'Eleven Madison Park, Le Bernardin, Per Se: il top mondiale.', priceRange: '€€€€', location: 'Manhattan' }
      ],
      'losangeles': [
        { id: 'e1', title: 'Tacos a East LA', description: 'Al pastor, carnitas, birria: la scena taco più autentica degli USA.', priceRange: '€', location: 'East LA' },
        { id: 'e2', title: 'In-N-Out Burger', description: 'Il burger californiano: Double-Double animal style, menu segreto.', priceRange: '€', location: 'Ovunque' },
        { id: 'e3', title: 'Korean BBQ a Koreatown', description: 'La più grande Koreatown fuori dalla Corea: griglie a volontà.', priceRange: '€€', location: 'Koreatown' },
        { id: 'e4', title: 'Farmers Market a The Grove', description: 'Dal 1934: cucine internazionali, prodotti freschi, celebrity spotting.', priceRange: '€€', location: 'Fairfax' }
      ],
      'sanfrancisco': [
        { id: 'e1', title: 'Clam chowder in sourdough bowl', description: 'Zuppa di vongole nel pane a lievitazione naturale: icona di SF.', priceRange: '€', location: 'Fisherman\'s Wharf' },
        { id: 'e2', title: 'Mission burrito', description: 'Il burrito della Mission: enorme, completo, cult dal 1969 (La Taqueria).', priceRange: '€', location: 'Mission District' },
        { id: 'e3', title: 'Dim Sum a Chinatown', description: 'Yank Sing, R&G Lounge: carrelli che girano, ordini col dito.', priceRange: '€€', location: 'Chinatown' },
        { id: 'e4', title: 'Farm-to-table a Berkeley', description: 'Chez Panisse di Alice Waters: dove è nato il movimento.', priceRange: '€€€€', location: 'Berkeley' }
      ],
      'miami': [
        { id: 'e1', title: 'Cuban sandwich a Little Havana', description: 'Prosciutto, maiale, formaggio, pickle, mostarda: premuto alla cubana.', priceRange: '€', location: 'Calle Ocho' },
        { id: 'e2', title: 'Ceviche a Brickell', description: 'Pesce marinato peruviano-miami style: fresco, piccante, trendy.', priceRange: '€€', location: 'Brickell' },
        { id: 'e3', title: 'Stone crab da Joe\'s', description: 'Chele di granchio con salsa mostarda: stagione ottobre-maggio.', priceRange: '€€€€', location: 'South Beach' },
        { id: 'e4', title: 'Cafecito a Versailles', description: 'Colazione cubana: café cubano, pastelitos, medianoche.', priceRange: '€', location: 'Little Havana' }
      ],
      'vancouver': [
        { id: 'e1', title: 'Sushi su Robson Street', description: 'Sushi grade altissimo a prezzi onesti: la scena giapponese è top.', priceRange: '€€', location: 'Downtown' },
        { id: 'e2', title: 'Japadog', description: 'Hot dog giapponese: teriyaki, oroshi, okonomi. Street food fusion.', priceRange: '€', location: 'Downtown' },
        { id: 'e3', title: 'Dim Sum a Richmond', description: 'La miglior dim sum fuori da Hong Kong: code la domenica mattina.', priceRange: '€', location: 'Richmond' },
        { id: 'e4', title: 'Granville Island Market', description: 'Pesce, formaggi, dolci: il mercato pubblico più amato del Canada.', priceRange: '€-€€', location: 'Granville Island' }
      ],
      'mexicocity': [
        { id: 'e1', title: 'Tacos al pastor', description: 'Maiale marinato su spiedo verticale: El Huequito è leggendario.', priceRange: '€', location: 'Centro' },
        { id: 'e2', title: 'Churros con chocolate', description: 'Churrería El Moro dal 1935: inzuppa nel cioccolato messicano.', priceRange: '€', location: 'Centro' },
        { id: 'e3', title: 'Mercado San Juan', description: 'Ingredienti gourmet: chapulines (cavallette), huitlacoche, formaggi artigianali.', priceRange: '€€', location: 'Centro' },
        { id: 'e4', title: 'Mezcal a La Clandestina', description: 'Mezcaleria hipster: degustazione con sal de gusano e arancia.', priceRange: '€€', location: 'Condesa' },
        { id: 'e5', title: 'Pujol (World\'s 50 Best)', description: 'Enrique Olvera reinterpreta la cucina messicana: mole madre 2500 giorni.', priceRange: '€€€€', location: 'Polanco' }
      ],
      // ===== SUD AMERICA =====
      'buenosaires': [
        { id: 'e1', title: 'Asado in parrilla', description: 'BBQ argentino: costilla, entraña, morcilla. Don Julio è il top.', priceRange: '€€-€€€', location: 'Palermo' },
        { id: 'e2', title: 'Empanadas', description: 'Fagottini ripieni di carne, cipolla, olive: ogni provincia ha la sua.', priceRange: '€', location: 'Ovunque' },
        { id: 'e3', title: 'Medialunas e café', description: 'Croissant argentini per colazione: dolci con dulce de leche.', priceRange: '€', location: 'Café Tortoni' },
        { id: 'e4', title: 'Helado', description: 'Il gelato argentino è serio: dulce de leche, sambayón al Cadore.', priceRange: '€', location: 'Palermo' }
      ],
      'riodejaneiro': [
        { id: 'e1', title: 'Feijoada', description: 'Stufato di fagioli neri e maiale: il piatto brasiliano del sabato.', priceRange: '€€', location: 'Casa da Feijoada' },
        { id: 'e2', title: 'Churrasco', description: 'Rodizio: camerieri portano tagli di carne infiniti, dì quando basta.', priceRange: '€€€', location: 'Fogo de Chão' },
        { id: 'e3', title: 'Açaí bowl', description: 'Superfood amazzonico: frozen con granola e frutta. Carburante da spiaggia.', priceRange: '€', location: 'Ovunque' },
        { id: 'e4', title: 'Caipirinha in boteco', description: 'Cachaça, lime, zucchero: il drink perfetto in un bar di quartiere.', priceRange: '€', location: 'Lapa' }
      ],
      'cusco': [
        { id: 'e1', title: 'Ceviche', description: 'Pesce marinato nel lime con mais gigante e patate dolci.', priceRange: '€', location: 'Mercati' },
        { id: 'e2', title: 'Cuy (porcellino d\'india)', description: 'Piatto inca tradizionale: croccante fuori, tenero dentro. Per i coraggiosi!', priceRange: '€€', location: 'Ristoranti tradizionali' },
        { id: 'e3', title: 'Pisco Sour', description: 'Cocktail nazionale: pisco, lime, albume, bitter. Musée del Pisco è top.', priceRange: '€', location: 'Plaza de Armas' },
        { id: 'e4', title: 'Mercado San Pedro', description: 'Succhi di frutta, zuppe calde, piatti locali a pochissimo.', priceRange: '€', location: 'San Pedro' }
      ],
      'cartagena': [
        { id: 'e1', title: 'Ceviche de camarón', description: 'Gamberi marinati nel lime con avocado: freschezza caraibica.', priceRange: '€', location: 'Ciudad Amurallada' },
        { id: 'e2', title: 'Arepa con huevo', description: 'Focaccina di mais fritta con uovo dentro: street food cartagenero.', priceRange: '€', location: 'Ovunque' },
        { id: 'e3', title: 'Coctel de frutas', description: 'Venditori ambulanti con carretto: mango, papaya, ananas con lime e sale.', priceRange: '€', location: 'Spiagge' },
        { id: 'e4', title: 'La Cevicheria', description: 'Di Rausch (chef colombiano famoso): ceviche gourmet, cocktail perfetti.', priceRange: '€€€', location: 'Getsemaní' }
      ],
      // ===== OCEANIA =====
      'sydney': [
        { id: 'e1', title: 'Fish and chips a Bondi', description: 'Barramundi fresco con vista sull\'oceano: il classico australiano.', priceRange: '€', location: 'Bondi Beach' },
        { id: 'e2', title: 'Meat pie', description: 'Torta salata ripiena di carne: comfort food australiano. Harry\'s Café de Wheels.', priceRange: '€', location: 'Woolloomooloo' },
        { id: 'e3', title: 'Brunch', description: 'Sydney ha inventato l\'avocado toast: Bills, Grounds of Alexandria.', priceRange: '€€', location: 'Surry Hills' },
        { id: 'e4', title: 'Sydney Fish Market', description: 'Il terzo mercato ittico più grande del mondo: sashimi, ostriche, aragoste.', priceRange: '€€', location: 'Pyrmont' }
      ],
      'melbourne': [
        { id: 'e1', title: 'Caffè specialty', description: 'Melbourne è la capitale mondiale del caffè: Patricia, Market Lane, St. Ali.', priceRange: '€', location: 'CBD/Brunswick' },
        { id: 'e2', title: 'Greek food a Oakleigh', description: 'La più grande comunità greca fuori dalla Grecia: souvlaki, baklava.', priceRange: '€', location: 'Oakleigh' },
        { id: 'e3', title: 'Dumplings a Chinatown', description: 'ShanDong Mama, HuTong: code lunghissime per dumplings perfetti.', priceRange: '€', location: 'Chinatown' },
        { id: 'e4', title: 'Rooftop bar', description: 'Loop, Naked for Satan, Rooftop Bar: cocktail con vista sulla città.', priceRange: '€€', location: 'CBD' }
      ],
      'queenstown': [
        { id: 'e1', title: 'Fergburger', description: 'Il burger più famoso della NZ: porzioni enormi, code alle 3 di notte.', priceRange: '€', location: 'Centro' },
        { id: 'e2', title: 'Lamb (agnello NZ)', description: 'L\'agnello neozelandese è tra i migliori al mondo: roast, rack, shank.', priceRange: '€€', location: 'Ristoranti' },
        { id: 'e3', title: 'Hokey Pokey gelato', description: 'Gelato al caramello con pezzi di honeycomb: gusto kiwi iconico.', priceRange: '€', location: 'Patagonia Chocolates' },
        { id: 'e4', title: 'Après-ski drinks', description: 'Dopo lo sci: vino di Central Otago, birre craft, fuoco che scoppietta.', priceRange: '€€', location: 'Vari' }
      ],
      'fiji': [
        { id: 'e1', title: 'Kokoda (ceviche fijiano)', description: 'Pesce crudo nel latte di cocco con lime e peperoncino.', priceRange: '€', location: 'Resort/Hotel' },
        { id: 'e2', title: 'Lovo feast', description: 'Carne e verdure cotte sotto terra in foglie di banano: tradizione.', priceRange: '€€', location: 'Villaggi' },
        { id: 'e3', title: 'Fiji Bitter', description: 'La birra nazionale ghiacciata: il modo migliore per rinfrescarsi.', priceRange: '€', location: 'Ovunque' },
        { id: 'e4', title: 'Fresh coconut', description: 'Bevuto direttamente dalla noce aperta con il machete: tropicale puro.', priceRange: '€', location: 'Spiagge' }
      ]
    };
    return items[cityId] || [
      { id: 'e1', title: 'Cucina Locale', description: 'Sapori autentici del territorio.', priceRange: '€€' }
    ];
  }

  private generateHistoryItems(cityId: string): SectionItem[] {
    const items: Record<string, SectionItem[]> = {
      // ===== ASIA =====
      'tokyo': [
        { id: 'h1', title: 'Da Edo a Tokyo', description: 'Tokyo nacque come piccolo villaggio di pescatori chiamato Edo nel XII secolo. Nel 1603, lo shogun Tokugawa Ieyasu la scelse come capitale del suo governo militare, trasformandola in una delle città più grandi del mondo. Nel 1868, con la Restaurazione Meiji, l\'imperatore si trasferì qui e la città fu rinominata Tokyo, "Capitale dell\'Est".' },
        { id: 'h2', title: 'La Rinascita del Dopoguerra', description: 'Rasa al suolo dai bombardamenti del 1945, Tokyo risorse dalle ceneri con incredibile determinazione. In soli 19 anni ospitò le Olimpiadi del 1964, mostrando al mondo il suo miracolo economico. Lo Shinkansen, inaugurato per l\'occasione, divenne simbolo del Giappone moderno.' },
        { id: 'h3', title: 'Curiosità: Più Stelle Michelin di Parigi', description: 'Tokyo detiene il record mondiale di stelle Michelin: oltre 200 ristoranti stellati, più di qualsiasi altra città al mondo. Dal sushi di Jiro ai ramen di Nakiryu, qui il cibo è un\'arte.' },
        { id: 'h4', title: 'Terremoti e Resilienza', description: 'Il Grande Terremoto del Kanto del 1923 uccise 140.000 persone e distrusse gran parte della città. Tokyo fu ricostruita con standard antisismici all\'avanguardia, e oggi i suoi grattacieli oscillano ma non crollano.' }
      ],
      'kyoto': [
        { id: 'h1', title: 'Mille Anni di Capitale', description: 'Kyoto fu la capitale del Giappone per oltre 1000 anni, dal 794 al 1868. Chiamata Heian-kyō, "Capitale della Pace", fu modellata sulla città cinese di Chang\'an. Qui nacquero il teatro Noh, la cerimonia del tè e l\'estetica wabi-sabi.' },
        { id: 'h2', title: 'Risparmiata dalla Bomba Atomica', description: 'Kyoto era nella lista degli obiettivi per la bomba atomica, ma il Segretario alla Guerra USA Henry Stimson, che aveva visitato la città in luna di miele, insistette per salvarla. Questa decisione preservò 2000 templi e santuari.' },
        { id: 'h3', title: 'Le Geishe di Gion', description: 'Le geishe non sono cortigiane ma artiste altamente addestrate in musica, danza e conversazione. A Kyoto si chiamano "geiko" e le apprendiste "maiko". Oggi ne restano circa 300, tesoro vivente del Giappone.' },
        { id: 'h4', title: 'I 17 Siti UNESCO', description: 'Kyoto vanta 17 siti Patrimonio dell\'Umanità, tra cui il Kinkaku-ji (Padiglione d\'Oro) e il Fushimi Inari con i suoi 10.000 torii rossi.' }
      ],
      'bali': [
        { id: 'h1', title: 'L\'Isola degli Dei', description: 'Bali è l\'unica isola a maggioranza induista in Indonesia, la nazione musulmana più popolosa al mondo. L\'induismo balinese è unico, mescolando credenze hindu, buddhiste e animiste locali. Ogni giorno i balinesi preparano offerte di fiori e incenso agli dei.' },
        { id: 'h2', title: 'Il Sistema Subak', description: 'Le iconiche risaie a terrazze di Bali sono gestite dal "subak", un sistema cooperativo di irrigazione del IX secolo riconosciuto dall\'UNESCO. I contadini condividono l\'acqua secondo regole antiche tramandate per generazioni.' },
        { id: 'h3', title: 'Nyepi: Il Giorno del Silenzio', description: 'Una volta l\'anno, per il Capodanno balinese, l\'intera isola si ferma. Niente luci, niente lavoro, niente viaggi. Perfino l\'aeroporto chiude. È il giorno più silenzioso sulla Terra.' },
        { id: 'h4', title: 'L\'Invasione Olandese e la Resistenza', description: 'Nel 1906, i raja balinesi scelsero il "puputan" (combattimento fino alla morte) piuttosto che arrendersi agli olandesi. Marciarono verso i cannoni nemici vestiti di bianco, con gioielli, scegliendo la morte onorevole.' }
      ],
      'bangkok': [
        { id: 'h1', title: 'La Venezia d\'Oriente', description: 'Bangkok fu costruita su una rete di canali (khlong) che le valse il soprannome di "Venezia d\'Oriente". Oggi molti canali sono stati interrati per far posto alle strade, ma alcuni quartieri conservano ancora questo carattere acquatico.' },
        { id: 'h2', title: 'Il Nome più Lungo del Mondo', description: 'Il nome completo di Bangkok in thailandese è lungo 169 caratteri e significa "Città degli angeli, grande città, residenza del Buddha di smeraldo...". È il nome di città più lungo del mondo secondo il Guinness.' },
        { id: 'h3', title: 'Da Capitale a Metropoli', description: 'Bangkok divenne capitale nel 1782 quando Re Rama I fondò la dinastia Chakri. Da piccolo avamposto commerciale è cresciuta fino a 10 milioni di abitanti, uno dei più grandi agglomerati urbani dell\'Asia.' },
        { id: 'h4', title: 'Il Buddha di Smeraldo', description: 'Il Wat Phra Kaew ospita il Buddha di Smeraldo, la statua più sacra della Thailandia. Alta solo 66 cm, è in realtà fatta di giada. Il Re cambia personalmente i suoi abiti tre volte l\'anno.' }
      ],
      'singapore': [
        { id: 'h1', title: 'Da Villaggio a Metropoli', description: 'Nel 1819, Sir Stamford Raffles sbarcò su un\'isola di pescatori e la trasformò in porto commerciale britannico. In 200 anni Singapore è passata da palude malarica a una delle nazioni più ricche del mondo.' },
        { id: 'h2', title: 'L\'Indipendenza Indesiderata', description: 'Singapore fu espulsa dalla Malaysia nel 1965 contro la sua volontà. Lee Kuan Yew pianse in diretta TV annunciando l\'indipendenza. Quella che sembrava una condanna divenne un\'opportunità: oggi Singapore ha un PIL pro capite superiore agli USA.' },
        { id: 'h3', title: 'Le Leggi Curiose', description: 'A Singapore è vietato vendere gomme da masticare (dal 1992), mangiare sui mezzi pubblici, e non tirare lo sciacquone può costarti una multa. Queste leggi severe hanno reso la città una delle più pulite e sicure al mondo.' },
        { id: 'h4', title: 'Il Giardino nella Città', description: 'Nonostante sia densamente popolata, Singapore è una delle città più verdi del mondo. Il 47% della superficie è coperta da vegetazione, e i Gardens by the Bay rappresentano il pinnacolo di questa filosofia "città-giardino".' }
      ],
      'dubai': [
        { id: 'h1', title: 'Da Villaggio di Pescatori a Metropoli', description: 'Nel 1960 Dubai era un piccolo villaggio di pescatori di perle. La scoperta del petrolio nel 1966 cambiò tutto, ma lo sceicco Rashid capì che il petrolio sarebbe finito. Investì in turismo e commercio, creando la Dubai moderna.' },
        { id: 'h2', title: 'Record Mondiali', description: 'Dubai detiene decine di record: l\'edificio più alto (Burj Khalifa, 828m), l\'hotel più lussuoso (Burj Al Arab), il centro commerciale più grande, la cornice più grande, la fontana danzante più grande...' },
        { id: 'h3', title: 'Le Isole Artificiali', description: 'Palm Jumeirah è visibile dallo spazio. Costruita con 94 milioni di metri cubi di sabbia, ha aggiunto 78 km di costa. The World, un arcipelago a forma di mappamondo, rimane in parte incompiuto.' },
        { id: 'h4', title: 'Zero Tasse e Diversità', description: 'Dubai non ha imposte sul reddito personale. L\'85% della popolazione è straniera: un crogiolo di 200 nazionalità che parlano 140 lingue diverse.' }
      ],
      // ===== EUROPA =====
      'paris': [
        { id: 'h1', title: 'Lutetia: Le Origini Romane', description: 'Parigi nacque come insediamento gallico sull\'Île de la Cité nel III secolo a.C. I Romani la conquistarono nel 52 a.C. e la chiamarono Lutetia. Le terme romane di Cluny testimoniano ancora quel periodo.' },
        { id: 'h2', title: 'La Rivoluzione Francese', description: 'Il 14 luglio 1789 la folla assaltò la Bastiglia, dando inizio alla Rivoluzione. Parigi vide la ghigliottina in Place de la Concorde, dove morirono Luigi XVI e Maria Antonietta. Da qui nacquero i principi di "Liberté, Égalité, Fraternité".' },
        { id: 'h3', title: 'Haussmann e la Parigi Moderna', description: 'Tra il 1853 e il 1870, il Barone Haussmann demolì la Parigi medievale e la ricostruì con i grandi boulevard, i palazzi uniformi e i parchi che vediamo oggi. Un\'operazione urbanistica senza precedenti.' },
        { id: 'h4', title: 'La Tour Eiffel: Da Odiata a Amata', description: 'Costruita per l\'Expo del 1889, la Torre Eiffel fu inizialmente detestata dagli intellettuali che la chiamarono "orribile scheletro". Doveva essere demolita dopo 20 anni, ma le sue antenne radio la salvarono. Oggi è il monumento più visitato al mondo.' }
      ],
      'rome': [
        { id: 'h1', title: 'La Fondazione Leggendaria', description: 'Secondo la leggenda, Roma fu fondata il 21 aprile 753 a.C. da Romolo, allattato insieme al gemello Remo dalla lupa. La città crebbe da piccolo villaggio sul Palatino a capitale di un impero che dominava il Mediterraneo.' },
        { id: 'h2', title: 'Caput Mundi', description: 'Al suo apice, l\'Impero Romano controllava 5 milioni di km² e 70 milioni di persone. Roma aveva un milione di abitanti, fognature, acquedotti e strade pavimentate quando Londra e Parigi erano villaggi di capanne.' },
        { id: 'h3', title: 'La Roma dei Papi', description: 'Dopo la caduta dell\'Impero, i Papi trasformarono Roma. Il Rinascimento portò Michelangelo (Cappella Sistina), Raffaello (Stanze Vaticane) e Bernini (Piazza San Pietro). La Chiesa ricostruì la città eterna.' },
        { id: 'h4', title: 'Curiosità: I 280 Fontanelle', description: 'Roma ha più di 2000 fontane, di cui 280 "nasoni" - fontanelle pubbliche a forma di naso da cui sgorga acqua potabilissima dell\'Acqua Vergine. I romani li usano dal 1874.' }
      ],
      'barcelona': [
        { id: 'h1', title: 'Barcino: La Città Romana', description: 'Barcellona fu fondata dai Romani come Barcino nel I secolo a.C. Le mura romane sono ancora visibili nel Barrio Gótico. La città crebbe sotto Visigoti, Mori e infine i Conti di Barcellona.' },
        { id: 'h2', title: 'Il Modernismo Catalano', description: 'Tra il 1888 e il 1911, Barcellona visse una rivoluzione architettonica. Gaudí, Domènech i Montaner e Puig i Cadafalch trasformarono la città con edifici fantastici. La Sagrada Familia, iniziata nel 1882, sarà completata nel 2026.' },
        { id: 'h3', title: 'La Guerra Civile', description: 'Barcellona fu l\'ultima grande città a cadere nelle mani di Franco nel 1939. Durante la dittatura, parlare catalano in pubblico era proibito. Oggi il catalano è tornato protagonista, simbolo dell\'identità locale.' },
        { id: 'h4', title: 'Le Olimpiadi del 1992', description: 'I Giochi Olimpici trasformarono Barcellona: fu aperta al mare con la Barceloneta rinnovata, costruito l\'Anello Olimpico di Montjuïc, e la città divenne meta turistica mondiale.' }
      ],
      'amsterdam': [
        { id: 'h1', title: 'Nata dall\'Acqua', description: 'Amsterdam significa "diga sull\'Amstel". Nel XII secolo era un villaggio di pescatori su paludi. I canali furono scavati nel XVII secolo durante l\'Età dell\'Oro, quando la città divenne il centro del commercio mondiale.' },
        { id: 'h2', title: 'L\'Età dell\'Oro Olandese', description: 'Nel 1600, Amsterdam era la città più ricca del mondo. La Compagnia delle Indie Orientali (VOC) fu la prima multinazionale della storia. Rembrandt, Vermeer e altri maestri dipinsero in questo periodo di prosperità.' },
        { id: 'h3', title: 'La Tolleranza Olandese', description: 'Amsterdam accolse rifugiati ebrei, ugonotti e pensatori liberi quando altrove erano perseguitati. Spinoza scrisse qui le sue opere. Questa tradizione di tolleranza continua oggi con le politiche liberali su droghe leggere e diritti LGBTQ+.' },
        { id: 'h4', title: 'Curiosità: 1281 Ponti e 25.000 Biciclette nel Canale', description: 'Amsterdam ha più ponti di Venezia (1281 contro 400) e più biciclette che abitanti. Ogni anno 25.000 bici vengono ripescate dai canali!' }
      ],
      'lisbon': [
        { id: 'h1', title: 'Una delle Città più Antiche d\'Europa', description: 'Lisbona è più antica di Roma di 4 secoli. I Fenici la fondarono intorno al 1200 a.C. chiamandola Allis Ubbo ("porto sicuro"). Passò per Romani, Visigoti e 400 anni di dominio moresco.' },
        { id: 'h2', title: 'L\'Era delle Scoperte', description: 'Da Lisbona partirono Vasco da Gama (rotta per l\'India, 1498) e le caravelle che scoprirono il Brasile. Il Portogallo divenne il primo impero globale. La Torre di Belém salutava le navi in partenza.' },
        { id: 'h3', title: 'Il Terremoto del 1755', description: 'Il 1° novembre 1755, un terremoto di magnitudo 8.5 seguito da tsunami e incendi distrusse l\'85% di Lisbona, uccidendo 40.000 persone. Il Marchese di Pombal ricostruì la città con il primo piano urbanistico antisismico della storia.' },
        { id: 'h4', title: 'Il Fado: Saudade in Musica', description: 'Il Fado, nato nei vicoli di Alfama nel XIX secolo, esprime la "saudade" - la malinconia portoghese per ciò che è perduto. Patrimonio UNESCO, si ascolta ancora nelle taverne tradizionali.' }
      ],
      // ===== AMERICHE =====
      'newyork': [
        { id: 'h1', title: 'Nuova Amsterdam', description: 'Nel 1626, gli olandesi comprarono Manhattan dai nativi Lenape per merci del valore di 60 fiorini (circa 1000$ attuali). Chiamarono l\'insediamento Nuova Amsterdam. Nel 1664 gli inglesi la conquistarono e la rinominarono New York.' },
        { id: 'h2', title: 'Ellis Island e l\'Immigrazione', description: 'Tra il 1892 e il 1954, 12 milioni di immigrati entrarono in America attraverso Ellis Island. Italiani, irlandesi, ebrei, polacchi... costruirono la New York che conosciamo. Il 40% degli americani ha un antenato passato da qui.' },
        { id: 'h3', title: 'I Grattacieli', description: 'New York inventò il grattacielo moderno. L\'Empire State Building (1931) fu costruito in soli 410 giorni durante la Grande Depressione. Oggi lo skyline conta oltre 7.000 edifici sopra i 7 piani.' },
        { id: 'h4', title: '11 Settembre 2001', description: 'L\'attacco alle Torri Gemelle cambiò New York e il mondo. Oggi, al posto del World Trade Center, due enormi vasche d\'acqua recitano i nomi delle 2.977 vittime. Il One World Trade Center, alto 541 metri, simboleggia la rinascita.' }
      ],
      'buenosaires': [
        { id: 'h1', title: 'La Parigi del Sudamerica', description: 'Buenos Aires fu fondata due volte: nel 1536 e definitivamente nel 1580. Arricchitasi con l\'esportazione di carne e grano, la classe alta costruì palazzi in stile parigino. Il Teatro Colón rivaleggia con La Scala di Milano.' },
        { id: 'h2', title: 'L\'Immigrazione Italiana', description: 'Tra il 1880 e il 1930, milioni di italiani emigrarono in Argentina. Oggi il 60% dei porteños ha origini italiane. Il lunfardo (gergo di Buenos Aires) è pieno di parole italiane, e la pizza argentina è una tradizione.' },
        { id: 'h3', title: 'Nascita del Tango', description: 'Il tango nacque nei conventillos (case popolari) della Boca e San Telmo alla fine del XIX secolo, dalla fusione di ritmi africani, italiani e creoli. Inizialmente considerato volgare, conquistò Parigi e poi il mondo.' },
        { id: 'h4', title: 'Eva Perón', description: 'Evita, moglie del presidente Perón, è ancora venerata dai descamisados (poveri). Morì a 33 anni nel 1952. La sua tomba nel cimitero della Recoleta è meta di pellegrinaggio. "Non piangere per me, Argentina."' }
      ],
      // ===== OCEANIA =====
      'sydney': [
        { id: 'h1', title: 'La Prima Flotta', description: 'Il 26 gennaio 1788, 11 navi britanniche con 750 detenuti sbarcarono a Sydney Cove, fondando la prima colonia europea in Australia. Quella che era una colonia penale è diventata una delle città più vivibili del mondo.' },
        { id: 'h2', title: 'Gli Eora: I Primi Abitanti', description: 'Gli aborigeni Eora vivevano nella baia di Sydney da 40.000 anni. La colonizzazione portò malattie e conflitti che decimarono la popolazione. Oggi l\'Australia riconosce questo passato con la "Welcome to Country" ceremony.' },
        { id: 'h3', title: 'L\'Opera House', description: 'Progettata dal danese Jørn Utzon, l\'Opera House richiese 16 anni di costruzione (1957-1973) e costò 14 volte il budget iniziale. Utzon si dimise prima del completamento e non la vide mai finita. Oggi è Patrimonio UNESCO.' },
        { id: 'h4', title: 'Le Olimpiadi del 2000', description: 'Le Olimpiadi di Sydney 2000 sono considerate le migliori di sempre. Cathy Freeman, aborigena, accese la fiamma olimpica e vinse i 400 metri. L\'Olympic Park è oggi un quartiere fiorente.' }
      ]
    };

    return items[cityId] || [
      { id: 'h1', title: 'Origini', description: 'Le radici antiche di questa città affascinante.' },
      { id: 'h2', title: 'Curiosità', description: 'Fatti sorprendenti che non troverai sulle guide.' }
    ];
  }

  private generatePracticalItems(cityId: string): SectionItem[] {
    const items: Record<string, SectionItem[]> = {
      'tokyo': [
        { id: 'p1', title: 'Trasporti', description: 'La metro di Tokyo è puntualissima ma labirintica. Compra una Suica o Pasmo card per muoverti facilmente. I treni JR coprono le aree esterne. Il taxi è costoso ma utile di notte.' },
        { id: 'p2', title: 'Lingua e Comunicazione', description: 'Pochi parlano inglese, ma i giapponesi sono gentilissimi. Google Translate con la fotocamera traduce i menu. Le indicazioni nelle stazioni sono in inglese.' },
        { id: 'p3', title: 'Denaro e Pagamenti', description: 'Il Giappone ama il contante! Molti ristoranti e negozi non accettano carte. Gli ATM nei 7-Eleven funzionano con carte straniere.' },
        { id: 'p4', title: 'Etichetta Giapponese', description: 'Non parlare al telefono sui treni. Togli le scarpe quando entri in case e alcuni ristoranti. Non lasciare mance: è considerato offensivo.' }
      ],
      'paris': [
        { id: 'p1', title: 'Trasporti', description: 'La metro di Parigi ha 16 linee e arriva ovunque. Compra un carnet di 10 biglietti o la Paris Visite card. Attenzione ai borseggiatori nelle stazioni turistiche.' },
        { id: 'p2', title: 'Orari dei Pasti', description: 'I francesi pranzano 12:00-14:00 e cenano dalle 19:30. Molti ristoranti chiudono tra i pasti. La domenica molti negozi sono chiusi.' },
        { id: 'p3', title: 'Lingua', description: 'Saluta sempre con "Bonjour" prima di chiedere qualcosa. I parigini apprezzano lo sforzo, anche se poi passano all\'inglese.' },
        { id: 'p4', title: 'Mance', description: 'Il servizio è incluso nel conto (service compris). Lasciare 1-2€ per un buon servizio è apprezzato ma non obbligatorio.' }
      ],
      'rome': [
        { id: 'p1', title: 'Trasporti', description: 'Roma si gira bene a piedi: il centro è compatto. La metro ha solo 3 linee. Gli autobus sono lenti ma panoramici. Taxi solo quelli bianchi ufficiali.' },
        { id: 'p2', title: 'Orari Italiani', description: 'La pausa pranzo è sacra: 13:00-15:30 molti negozi chiudono. I ristoranti servono pranzo 12:30-15:00, cena dalle 19:30. Mai ordinare cappuccino dopo le 11!' },
        { id: 'p3', title: 'Prenotazioni', description: 'Prenota online Colosseo, Musei Vaticani e Galleria Borghese per evitare code di ore. La Roma Pass offre sconti e trasporti.' },
        { id: 'p4', title: 'Acqua Potabile', description: 'I "nasoni" (fontanelle) di Roma offrono acqua fresca e potabile gratis. Porta una borraccia e riempila ovunque!' }
      ],
      'barcelona': [
        { id: 'p1', title: 'Trasporti', description: 'La metro è efficiente e copre tutta la città. La T-Casual (10 viaggi) è il biglietto migliore. Il Bus Turístic collega le attrazioni principali.' },
        { id: 'p2', title: 'Sicurezza', description: 'Barcellona ha problemi di borseggio. Attenzione sulla Rambla, in metro e in spiaggia. Usa borse a tracolla davanti e non lasciare nulla incustodito.' },
        { id: 'p3', title: 'Orari Spagnoli', description: 'Gli spagnoli cenano tardi: i ristoranti aprono per cena alle 20:30-21:00. Il pranzo è alle 14:00. La domenica molti locali chiudono.' },
        { id: 'p4', title: 'Lingua', description: 'Si parla catalano e castigliano. I locali apprezzano un "Bon dia" o "Gràcies". L\'inglese è diffuso nelle zone turistiche.' }
      ],
      'amsterdam': [
        { id: 'p1', title: 'In Bicicletta', description: 'Amsterdam ha 400 km di piste ciclabili. Noleggia una bici e muoviti come un local. Attenzione ai tram e ai turisti che camminano sulle ciclabili!' },
        { id: 'p2', title: 'Trasporti Pubblici', description: 'Compra la OV-chipkaart per tram, bus e metro. I biglietti cartacei costano di più. Il traghetto per Noord è gratuito.' },
        { id: 'p3', title: 'Coffee Shop', description: 'I coffee shop vendono cannabis legalmente. Non si può fumare tabacco dentro. Chiedi sempre consiglio al banco se sei inesperto.' },
        { id: 'p4', title: 'Quartiere a Luci Rosse', description: 'Il Red Light District è sicuro di giorno e di notte, ma non fotografare le vetrine: è vietato e irrispettoso. I tour guidati spiegano la storia.' }
      ],
      'lisbon': [
        { id: 'p1', title: 'Trasporti', description: 'Il Tram 28 è iconico ma affollatissimo. La metro è moderna ed economica. La Lisboa Card include trasporti e musei. Le salite sono ripide: considera le funicolari!' },
        { id: 'p2', title: 'Orari Portoghesi', description: 'Pranzo 12:30-14:30, cena dalle 20:00. Molti ristoranti chiudono tra i pasti. La domenica il centro è più tranquillo.' },
        { id: 'p3', title: 'Denaro', description: 'Le carte sono accettate quasi ovunque, ma porta contanti per i negozi più piccoli e il Tram 28.' },
        { id: 'p4', title: 'Sicurezza', description: 'Lisbona è molto sicura, ma attenzione ai borseggiatori sul Tram 28 e nella Baixa. Non lasciare oggetti in vista in auto.' }
      ],
      'newyork': [
        { id: 'p1', title: 'Trasporti', description: 'La Subway funziona 24/7 ed è il modo più veloce per muoversi. Compra una MetroCard illimitata. Uber e Lyft sono ovunque. I taxi gialli sono iconici ma non economici.' },
        { id: 'p2', title: 'Mance Obbligatorie', description: 'Negli USA le mance sono parte dello stipendio. Lascia 15-20% nei ristoranti, 1-2$ per drink nei bar, 1$ per bagaglio al portiere.' },
        { id: 'p3', title: 'Dimensioni delle Porzioni', description: 'Le porzioni americane sono ENORMI. Un piatto può bastare per due. I refill delle bevande sono spesso gratuiti.' },
        { id: 'p4', title: 'Prezzi + Tax', description: 'I prezzi esposti non includono la sales tax (8.875% a NYC). Al ristorante aggiungi anche la mancia. Lo scontrino sarà più alto del previsto!' }
      ],
      'dubai': [
        { id: 'p1', title: 'Clima', description: 'L\'estate (maggio-settembre) è insopportabile: 45°C e umidità altissima. Visita da novembre ad aprile. L\'aria condizionata è ovunque, porta un cardigan.' },
        { id: 'p2', title: 'Dress Code', description: 'Rispetta la cultura locale: spalle e ginocchia coperte nei luoghi pubblici (non in spiaggia o hotel). Nei mall e moschee vige un dress code moderato.' },
        { id: 'p3', title: 'Alcol', description: 'L\'alcol si trova solo nei ristoranti degli hotel e nei bar con licenza. È costoso. Zero tolleranza per la guida in stato di ebbrezza.' },
        { id: 'p4', title: 'Weekend Locale', description: 'Il weekend a Dubai è venerdì-sabato. Il venerdì è il giorno sacro musulmano. Domenica è un normale giorno lavorativo.' }
      ],
      'sydney': [
        { id: 'p1', title: 'Trasporti', description: 'L\'Opal Card funziona su treni, bus, traghetti e light rail. Il traghetto per Manly è un\'attrazione turistica in sé!' },
        { id: 'p2', title: 'Sole Australiano', description: 'Il sole australiano è fortissimo: crema solare SPF 50+, cappello e occhiali sono essenziali. "Slip, slop, slap!" è il mantra australiano.' },
        { id: 'p3', title: 'Animali Pericolosi', description: 'Nuota tra le bandiere rosse e gialle sorvegliate dai lifeguard. Le meduse box jellyfish sono rare a Sydney ma esistono. I ragni sono più comuni degli squali.' },
        { id: 'p4', title: 'Costo della Vita', description: 'Sydney è cara: un caffè costa 5-6 AUD, un pasto 20-30 AUD, una birra 10-12 AUD. I supermercati sono l\'opzione economica.' }
      ]
    };

    return items[cityId] || [
      { id: 'p1', title: 'Come Muoversi', description: 'Trasporti pubblici, taxi e alternative.' },
      { id: 'p2', title: 'Documenti Necessari', description: 'Tutto quello che serve per entrare.' }
    ];
  }

  private generateIconicItems(cityId: string): SectionItem[] {
    const items: Record<string, SectionItem[]> = {
      'tokyo': [
        { id: 'i1', title: 'Tokyo Tower', description: 'Ispirata alla Torre Eiffel ma 13 metri più alta, la Tokyo Tower (333m) domina lo skyline dal 1958. Di notte si illumina di arancione o bianco a seconda della stagione.', image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=1200&q=80' },
        { id: 'i2', title: 'Incrocio di Shibuya', description: 'L\'incrocio più fotografato del mondo: quando il semaforo diventa verde, fino a 3000 persone attraversano contemporaneamente da tutte le direzioni. Guardalo dall\'alto allo Starbucks.', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&q=80' },
        { id: 'i3', title: 'Statua di Hachiko', description: 'Hachiko, il cane che aspettò il padrone defunto alla stazione di Shibuya per 9 anni, è diventato simbolo di lealtà. La sua statua è il punto d\'incontro più famoso di Tokyo.', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&q=80' }
      ],
      'paris': [
        { id: 'i1', title: 'Torre Eiffel', description: 'La Dame de Fer fu costruita per l\'Expo 1889. Pesa 7.300 tonnellate e viene ridipinta ogni 7 anni con 60 tonnellate di vernice. Di notte scintilla per 5 minuti ogni ora.', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1200&q=80' },
        { id: 'i2', title: 'Arco di Trionfo', description: 'Napoleone lo commissionò nel 1806 per celebrare le vittorie militari. Sotto l\'arco arde la fiamma eterna del Milite Ignoto. La vista sui Champs-Élysées è indimenticabile.', image: 'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=1200&q=80' },
        { id: 'i3', title: 'Sacré-Cœur', description: 'La basilica bianca su Montmartre fu costruita dopo la sconfitta di Sedan (1870) come "espiazione". Il suo campanile ospita la Savoyarde, una delle campane più grandi del mondo.', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=1200&q=80' }
      ],
      'rome': [
        { id: 'i1', title: 'Colosseo', description: 'L\'Anfiteatro Flavio poteva ospitare 50.000 spettatori per i giochi dei gladiatori. Costruito in soli 8 anni (72-80 d.C.), usava un sistema di carrucole per far apparire animali dal sottosuolo.', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80' },
        { id: 'i2', title: 'Fontana di Trevi', description: 'Ogni giorno vengono lanciati circa 3000€ nella fontana. I soldi vengono raccolti ogni notte e donati alla Caritas. La tradizione dice che chi lancia una moneta tornerà a Roma.', image: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=1200&q=80' },
        { id: 'i3', title: 'Cupola di San Pietro', description: 'Progettata da Michelangelo, la cupola di San Pietro è la più grande del mondo (42m di diametro). Salire i 551 gradini regala una vista su tutta Roma.', image: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=1200&q=80' }
      ],
      'barcelona': [
        { id: 'i1', title: 'Sagrada Familia', description: 'Gaudí lavorò alla basilica per 43 anni, sapendo che non l\'avrebbe vista finita. Iniziata nel 1882, sarà completata nel 2026, centenario della sua morte. Le torri arriveranno a 172.5 metri.', image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&q=80' },
        { id: 'i2', title: 'Park Güell', description: 'Nato come città-giardino per 60 famiglie ricche, fu un flop commerciale. Oggi è il parco più visitato di Spagna: il drago di mosaico (El Drac) è il simbolo di Barcellona.', image: 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?w=1200&q=80' },
        { id: 'i3', title: 'Casa Batlló', description: 'La "Casa delle Ossa" ha una facciata ondulata che ricorda il mare, con balconi a forma di teschio e un tetto a scaglie di drago. È il capolavoro domestico di Gaudí.', image: 'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729?w=1200&q=80' }
      ],
      'amsterdam': [
        { id: 'i1', title: 'Canali (Grachtengordel)', description: 'I 165 canali di Amsterdam formano 90 isole collegate da 1281 ponti. Costruiti nel XVII secolo per drenare le paludi e trasportare merci, sono Patrimonio UNESCO dal 2010.', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&q=80' },
        { id: 'i2', title: 'Case Storte', description: 'Le case di Amsterdam sono strette e inclinate in avanti per design: facilitava il sollevamento delle merci con carrucole. Alcune si sono inclinate con il tempo, creando l\'effetto "ubriaco".' },
        { id: 'i3', title: 'I Mulini a Vento di Zaanse Schans', description: 'A 20 minuti da Amsterdam, questi mulini del XVII secolo producevano olio, vernici e spezie. Oggi sono un museo vivente della tradizione olandese.' }
      ],
      'lisbon': [
        { id: 'i1', title: 'Torre di Belém', description: 'Costruita nel 1515 per difendere l\'estuario del Tago, la torre in stile manuelino salutava le navi in partenza per le Indie. È il simbolo dell\'Era delle Scoperte.', image: 'https://images.unsplash.com/photo-1548707309-dcebeab9ea9b?w=1200&q=80' },
        { id: 'i2', title: 'Tram 28', description: 'Il tram giallo del 1930 si arrampica per le strade strette di Alfama e Graça con pendenze del 13.5%. È una macchina del tempo che attraversa la Lisbona antica.' },
        { id: 'i3', title: 'Elevador de Santa Justa', description: 'Questo ascensore neo-gotico del 1902, progettato da un allievo di Eiffel, collega la Baixa al Bairro Alto. La vista dalla terrazza in cima vale la coda.' }
      ],
      'newyork': [
        { id: 'i1', title: 'Statua della Libertà', description: 'Dono della Francia nel 1886, Lady Liberty è alta 93 metri con il piedistallo. La sua corona ha 7 raggi che rappresentano i 7 continenti e oceani.', image: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200&q=80' },
        { id: 'i2', title: 'Empire State Building', description: 'Per 40 anni fu l\'edificio più alto del mondo (443m). Costruito in 410 giorni durante la Depressione, impiegava 3.400 operai al giorno. King Kong lo scalò nel 1933.' },
        { id: 'i3', title: 'Brooklyn Bridge', description: 'Completato nel 1883, fu il primo ponte sospeso in acciaio e il più lungo del mondo. Ci vollero 14 anni e la vita di 27 operai. La passeggiata al tramonto è magica.' }
      ],
      'dubai': [
        { id: 'i1', title: 'Burj Khalifa', description: 'L\'edificio più alto del mondo (828m, 163 piani) svetta come un ago nel deserto. L\'ascensore più veloce (10 m/s) porta all\'osservatorio al 148° piano in 60 secondi.', image: 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200&q=80' },
        { id: 'i2', title: 'Burj Al Arab', description: 'L\'unico hotel "7 stelle" al mondo (autoattribuito). A forma di vela, sorge su un\'isola artificiale. La suite reale costa 24.000$/notte.' },
        { id: 'i3', title: 'The Dubai Fountain', description: 'La fontana danzante più grande del mondo: 150 metri di larghezza, getti alti 152 metri, 6600 luci. Ogni sera offre spettacoli gratuiti ogni 30 minuti.' }
      ],
      'sydney': [
        { id: 'i1', title: 'Sydney Opera House', description: 'Le "vele" bianche del capolavoro di Jørn Utzon sono rivestite da 1.056.006 piastrelle svedesi autopulenti. L\'edificio ospita 1500 spettacoli all\'anno.', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80' },
        { id: 'i2', title: 'Sydney Harbour Bridge', description: 'La "gruccia" più famosa del mondo fu completata nel 1932. Puoi scalarla con BridgeClimb (134 metri sul mare) o attraversarla a piedi gratuitamente.' },
        { id: 'i3', title: 'Bondi Beach', description: 'La spiaggia più iconica d\'Australia: surfisti, lifeguard in rosso e giallo, e la Bondi to Coogee coastal walk di 6 km con vista mozzafiato sull\'oceano.' }
      ]
    };

    return items[cityId] || [
      { id: 'i1', title: 'Il Simbolo della Città', description: 'Il luogo che rappresenta l\'anima del posto.' }
    ];
  }

  private getPracticalInfo(cityId: string): CityDetails['practicalInfo'] {
    const info: Record<string, CityDetails['practicalInfo']> = {
      // ===== ASIA =====
      'tokyo': {
        documents: 'Passaporto valido. Visto non richiesto per soggiorni fino a 90 giorni per cittadini UE.',
        bestTimeToVisit: 'Primavera (marzo-maggio) per i ciliegi, Autunno (settembre-novembre) per il foliage.',
        averageCosts: { meal: '€10-30', transport: '€5-15/giorno', accommodation: '€60-150/notte' },
        gettingAround: ['Metro efficientissima (Suica card)', 'JR Pass per viaggi fuori città', 'Evita i taxi (costosi)'],
        tipsFromLocals: ['Non parlare al telefono sui mezzi', 'Porta sempre contanti', 'Togli le scarpe quando richiesto']
      },
      'kyoto': {
        documents: 'Passaporto valido. Visto non richiesto per soggiorni fino a 90 giorni per cittadini UE.',
        bestTimeToVisit: 'Primavera (ciliegi) e autunno (foglie rosse). Evita luglio-agosto (caldo umido).',
        averageCosts: { meal: '€8-25', transport: '€4-10/giorno', accommodation: '€50-200/notte' },
        gettingAround: ['Bus turistici (1-day pass)', 'Bicicletta (molti noleggi)', 'Treno per spostamenti'],
        tipsFromLocals: ['I templi chiudono alle 17', 'Visita Fushimi Inari all\'alba', 'Rispetta il silenzio nei templi']
      },
      'bali': {
        documents: 'Passaporto valido 6+ mesi. Visa on arrival per 30 giorni (35 USD, estendibile).',
        bestTimeToVisit: 'Stagione secca (aprile-ottobre). Evita Natale/Capodanno (prezzi x3).',
        averageCosts: { meal: '€3-15', transport: '€5-20/giorno', accommodation: '€20-100/notte' },
        gettingAround: ['Scooter (patente internazionale)', 'Driver privato (€30-40/giorno)', 'Grab/Gojek (rideshare)'],
        tipsFromLocals: ['Baratta sempre (50% dello starting price)', 'Non toccare la testa delle persone', 'Vesti modesto nei templi']
      },
      'bangkok': {
        documents: 'Passaporto valido 6+ mesi. Visto non richiesto fino a 45 giorni per turismo.',
        bestTimeToVisit: 'Novembre-febbraio (stagione fresca). Evita aprile (caldissimo).',
        averageCosts: { meal: '€2-10', transport: '€2-8/giorno', accommodation: '€15-80/notte' },
        gettingAround: ['BTS/MRT (metro sopraelevata)', 'Grab per taxi sicuri', 'Tuk-tuk solo per esperienza'],
        tipsFromLocals: ['Non criticare mai la monarchia', 'Togli le scarpe nei templi', 'Porta sempre un ombrello']
      },
      'singapore': {
        documents: 'Passaporto valido 6+ mesi. Visto non richiesto fino a 90 giorni.',
        bestTimeToVisit: 'Tutto l\'anno (tropicale costante). Dicembre-gennaio più piovoso.',
        averageCosts: { meal: '€3-30', transport: '€5-15/giorno', accommodation: '€80-250/notte' },
        gettingAround: ['MRT efficientissimo', 'Bus capillare', 'Taxi/Grab economici e sicuri'],
        tipsFromLocals: ['Non masticare gomme (multa)', 'Non mangiare sui mezzi pubblici', 'Aria condizionata ovunque: porta una felpa']
      },
      'seoul': {
        documents: 'Passaporto valido. K-ETA richiesta (€8, valida 2 anni).',
        bestTimeToVisit: 'Primavera (aprile-maggio) e autunno (settembre-novembre).',
        averageCosts: { meal: '€5-20', transport: '€3-10/giorno', accommodation: '€40-120/notte' },
        gettingAround: ['Metro capillare (T-money card)', 'Bus notturni', 'Taxi economici e sicuri'],
        tipsFromLocals: ['Versa da bere agli altri, mai a te stesso', 'Inchino leggero per salutare', 'Tutto è aperto fino a tardi']
      },
      'hanoi': {
        documents: 'Passaporto valido 6+ mesi. E-visa online (25 USD, 30 giorni).',
        bestTimeToVisit: 'Ottobre-dicembre e marzo-aprile. Evita estate (monsoni).',
        averageCosts: { meal: '€2-8', transport: '€1-5/giorno', accommodation: '€15-50/notte' },
        gettingAround: ['Grab moto o auto', 'A piedi nel Quartiere Vecchio', 'Evita di guidare (traffico caotico)'],
        tipsFromLocals: ['Attraversa la strada con calma costante', 'Baratta sempre', 'Contanti ovunque']
      },
      'dubai': {
        documents: 'Passaporto valido 6+ mesi. Visto gratuito all\'arrivo per 90 giorni (cittadini UE).',
        bestTimeToVisit: 'Novembre-marzo (inverno mite). Estate fino a 50°C!',
        averageCosts: { meal: '€10-50', transport: '€5-30/giorno', accommodation: '€80-400/notte' },
        gettingAround: ['Metro moderna', 'Taxi Uber/Careem', 'Tram per la Marina'],
        tipsFromLocals: ['Vestiti modesti fuori dai resort', 'No PDA (effusioni pubbliche)', 'Alcol solo in hotel/bar autorizzati']
      },
      // ===== EUROPA =====
      'lisbon': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Primavera e autunno per clima mite e meno turisti.',
        averageCosts: { meal: '€8-20', transport: '€3-6/giorno', accommodation: '€40-100/notte' },
        gettingAround: ['Tram 28 iconico', 'Metro moderna', 'Molto camminabile (ma salite!)'],
        tipsFromLocals: ['Evita i ristoranti sul Tram 28', 'Cenare dopo le 21', 'Scarpe comode obbligatorie']
      },
      'barcelona': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Maggio-giugno e settembre-ottobre. Estate affollata e calda.',
        averageCosts: { meal: '€10-25', transport: '€4-10/giorno', accommodation: '€50-150/notte' },
        gettingAround: ['Metro efficiente (T-Casual 10 viaggi)', 'A piedi nel centro', 'Bici elettriche'],
        tipsFromLocals: ['Attenzione ai borseggiatori', 'Prenota la Sagrada Familia online', 'Tapas solo nei bar veri']
      },
      'paris': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Aprile-giugno e settembre-ottobre. Agosto: parigini in vacanza.',
        averageCosts: { meal: '€12-35', transport: '€5-15/giorno', accommodation: '€80-200/notte' },
        gettingAround: ['Metro capillare (Navigo week €30)', 'RER per aeroporti', 'Vélib biciclette condivise'],
        tipsFromLocals: ['Saluta sempre entrando nei negozi', 'Prenota tutto in anticipo', 'Cena non prima delle 20']
      },
      'rome': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Aprile-maggio e settembre-ottobre. Estate torrida e affollata.',
        averageCosts: { meal: '€10-25', transport: '€3-8/giorno', accommodation: '€50-150/notte' },
        gettingAround: ['Metro (2 linee utili)', 'A piedi nel centro', 'Autobus per periferia'],
        tipsFromLocals: ['Prenota Vaticano e Colosseo online', 'Evita i ristoranti sui monumenti', 'Acqua fresca dalle nasone']
      },
      'amsterdam': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Aprile-maggio (tulipani) e settembre. Inverno freddo ma suggestivo.',
        averageCosts: { meal: '€12-30', transport: '€3-10/giorno', accommodation: '€80-180/notte' },
        gettingAround: ['Bicicletta (noleggio o OV-fiets)', 'Tram e metro', 'A piedi nel centro'],
        tipsFromLocals: ['Attenzione alle bici (precedenza a loro!)', 'Prenota Anne Frank mesi prima', 'Coffeeshop ≠ café (caffè)']
      },
      'prague': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Primavera e autunno. Dicembre per i mercatini di Natale.',
        averageCosts: { meal: '€6-15', transport: '€2-5/giorno', accommodation: '€30-80/notte' },
        gettingAround: ['Metro e tram (Lítačka card)', 'A piedi nel centro storico', 'Taxi solo con tassametro'],
        tipsFromLocals: ['Cambia soldi solo nelle banche', 'Ponte Carlo: vai all\'alba', 'La birra costa meno dell\'acqua']
      },
      'vienna': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Primavera e dicembre (mercatini). Estate per i concerti all\'aperto.',
        averageCosts: { meal: '€12-30', transport: '€4-10/giorno', accommodation: '€60-150/notte' },
        gettingAround: ['Metro U-Bahn eccellente', 'Tram storici', 'Vienna Card per sconti'],
        tipsFromLocals: ['Prenota Opera e Schönbrunn', 'Nicht rauchen nei luoghi pubblici', 'I caffè sono istituzioni: non affrettarti']
      },
      'reykjavik': {
        documents: 'Carta d\'identità valida per cittadini UE (Schengen).',
        bestTimeToVisit: 'Giugno-agosto per sole 24h. Inverno per aurora boreale.',
        averageCosts: { meal: '€20-50', transport: '€5-30/giorno', accommodation: '€100-250/notte' },
        gettingAround: ['Auto a noleggio (quasi obbligatoria)', 'A piedi in centro', 'Bus Strætó per escursioni'],
        tipsFromLocals: ['Porta strati di vestiti', 'Il meteo cambia ogni 10 minuti', 'Rispetta la natura: niente sentieri improvvisati']
      },
      'athens': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Aprile-giugno e settembre-ottobre. Estate molto calda.',
        averageCosts: { meal: '€8-18', transport: '€2-6/giorno', accommodation: '€40-100/notte' },
        gettingAround: ['Metro moderna (3 linee)', 'A piedi nel centro', 'Taxi economici'],
        tipsFromLocals: ['Visita l\'Acropoli all\'apertura', 'Le taverne senza menu sono le migliori', 'Siesta: negozi chiusi 15-17']
      },
      'florence': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Aprile-maggio e settembre-ottobre. Evita agosto (caldo, chiusure).',
        averageCosts: { meal: '€12-30', transport: '€2-5/giorno', accommodation: '€60-150/notte' },
        gettingAround: ['A piedi (centro compatto)', 'Bus ATAF', 'Treno per Pisa, Siena'],
        tipsFromLocals: ['Prenota Uffizi e Accademia online', 'No pranzo al sacco in strada (multe)', 'Coperto è la norma nei ristoranti']
      },
      'santorini': {
        documents: 'Carta d\'identità valida per cittadini UE.',
        bestTimeToVisit: 'Maggio-giugno e settembre. Luglio-agosto: affollato e costoso.',
        averageCosts: { meal: '€15-35', transport: '€5-30/giorno', accommodation: '€100-400/notte' },
        gettingAround: ['Noleggio quad o auto', 'Bus KTEL economici', 'Taxi/transfer prenotati'],
        tipsFromLocals: ['Prenota il tramonto a Oia con largo anticipo', 'Le spiagge sono di sabbia nera vulcanica', 'Fira più economica di Oia']
      },
      'dubrovnik': {
        documents: 'Carta d\'identità valida per cittadini UE (Croazia in Schengen).',
        bestTimeToVisit: 'Maggio-giugno e settembre. Evita agosto (navi da crociera).',
        averageCosts: { meal: '€12-30', transport: '€2-10/giorno', accommodation: '€80-200/notte' },
        gettingAround: ['A piedi nella città vecchia', 'Bus per spiagge', 'Ferry per le isole'],
        tipsFromLocals: ['Mura: vai presto o tardi', 'Nessun bagaglio a rotelle (tutto gradini)', 'Spiagge fuori mura più belle']
      },
      // ===== AFRICA =====
      'marrakech': {
        documents: 'Passaporto valido 6+ mesi. Visto non richiesto fino a 90 giorni.',
        bestTimeToVisit: 'Marzo-maggio e ottobre-novembre. Estate oltre 40°C.',
        averageCosts: { meal: '€4-15', transport: '€1-10/giorno', accommodation: '€30-150/notte' },
        gettingAround: ['A piedi nella Medina', 'Taxi petit (fisso il prezzo prima)', 'Calesse per turismo'],
        tipsFromLocals: ['Baratta SEMPRE (50% del prezzo)', 'Mai foto senza permesso', 'Guide ufficiali solo (badge)']
      },
      'capetown': {
        documents: 'Passaporto valido 30+ giorni. Visto non richiesto fino a 90 giorni per UE.',
        bestTimeToVisit: 'Novembre-marzo (estate australe). Inverno piovoso ma verde.',
        averageCosts: { meal: '€8-25', transport: '€3-15/giorno', accommodation: '€40-150/notte' },
        gettingAround: ['Uber/Bolt sicuri ed economici', 'MyCiti bus', 'Auto per Garden Route'],
        tipsFromLocals: ['Non camminare di notte nelle zone isolate', 'Prenota Table Mountain presto', 'Crisi idrica: docce brevi']
      },
      'cairo': {
        documents: 'Passaporto valido 6+ mesi. Visa on arrival (25 USD) o e-visa.',
        bestTimeToVisit: 'Ottobre-aprile. Estate oltre 40°C e umidità.',
        averageCosts: { meal: '€3-12', transport: '€1-5/giorno', accommodation: '€20-80/notte' },
        gettingAround: ['Uber sicuro', 'Metro per fughe dal traffico', 'Evita di guidare'],
        tipsFromLocals: ['Baratta tutto', 'Evita l\'acqua del rubinetto', 'Visita le Piramidi all\'alba per le foto']
      },
      'zanzibar': {
        documents: 'Passaporto valido 6+ mesi. Visa on arrival (50 USD).',
        bestTimeToVisit: 'Giugno-ottobre (secco). Evita aprile-maggio (piogge).',
        averageCosts: { meal: '€5-15', transport: '€5-20/giorno', accommodation: '€30-150/notte' },
        gettingAround: ['Dala-dala (minibus locali)', 'Taxi/transfer', 'Scooter (con cautela)'],
        tipsFromLocals: ['Vestiti modesti fuori dai resort (cultura musulmana)', 'Porta dollari in contanti', 'Le maree cambiano le spiagge']
      },
      // ===== NORD AMERICA =====
      'newyork': {
        documents: 'Passaporto valido + ESTA (21 USD, 2 anni).',
        bestTimeToVisit: 'Aprile-giugno e settembre-ottobre. Dicembre per l\'atmosfera.',
        averageCosts: { meal: '€15-40', transport: '€5-20/giorno', accommodation: '€150-350/notte' },
        gettingAround: ['Subway 24/7 (MetroCard)', 'A piedi a Manhattan', 'Uber/Lyft per Brooklyn'],
        tipsFromLocals: ['Mancia 18-20% obbligatoria', 'Cammina veloce (destra del marciapiede)', 'Niente foto in mezzo alla strada']
      },
      'losangeles': {
        documents: 'Passaporto valido + ESTA (21 USD, 2 anni).',
        bestTimeToVisit: 'Tutto l\'anno (clima perfetto). Primavera e autunno ideali.',
        averageCosts: { meal: '€12-35', transport: '€10-40/giorno', accommodation: '€100-250/notte' },
        gettingAround: ['Auto quasi obbligatoria', 'Uber/Lyft', 'Metro limitata ma in espansione'],
        tipsFromLocals: ['Il traffico è infernale (evita rush hour)', 'Mancia 18-20%', 'Tutto è lontano da tutto']
      },
      'sanfrancisco': {
        documents: 'Passaporto valido + ESTA (21 USD, 2 anni).',
        bestTimeToVisit: 'Settembre-ottobre (estate indiana). Estate: nebbia e freddo!',
        averageCosts: { meal: '€15-40', transport: '€5-20/giorno', accommodation: '€150-300/notte' },
        gettingAround: ['BART/Muni', 'Cable car (esperienza)', 'A piedi nei quartieri'],
        tipsFromLocals: ['Porta strati (microclimi)', 'Prenota Alcatraz settimane prima', 'Non lasciare nulla in auto visibile']
      },
      'miami': {
        documents: 'Passaporto valido + ESTA (21 USD, 2 anni).',
        bestTimeToVisit: 'Novembre-aprile. Estate calda, umida e con uragani.',
        averageCosts: { meal: '€12-35', transport: '€5-25/giorno', accommodation: '€100-300/notte' },
        gettingAround: ['Auto consigliata', 'Uber/Lyft', 'Metromover gratuito downtown'],
        tipsFromLocals: ['Lo spagnolo aiuta', 'Mancia 18-20%', 'Crema solare sempre']
      },
      'vancouver': {
        documents: 'Passaporto valido + eTA (7 CAD).',
        bestTimeToVisit: 'Giugno-settembre. Inverno piovoso ma bello per sci.',
        averageCosts: { meal: '€12-30', transport: '€5-15/giorno', accommodation: '€100-200/notte' },
        gettingAround: ['SkyTrain efficiente', 'SeaBus panoramico', 'A piedi/bici downtown'],
        tipsFromLocals: ['Porta un ombrello sempre', 'Prenota Capilano in anticipo', 'Le montagne sono a 30 min']
      },
      'mexicocity': {
        documents: 'Passaporto valido. Visto non richiesto fino a 180 giorni per turismo.',
        bestTimeToVisit: 'Marzo-maggio (secco). Altitudine: acclimatati gradualmente.',
        averageCosts: { meal: '€4-15', transport: '€1-5/giorno', accommodation: '€30-80/notte' },
        gettingAround: ['Metro (€0.25 a corsa!)', 'Uber sicuro', 'A piedi nei quartieri'],
        tipsFromLocals: ['Non bere acqua del rubinetto', 'Uber più sicuro dei taxi', 'Attenzione all\'altitudine (2240m)']
      },
      // ===== SUD AMERICA =====
      'buenosaires': {
        documents: 'Passaporto valido. Visto non richiesto fino a 90 giorni per UE.',
        bestTimeToVisit: 'Marzo-maggio e settembre-novembre. Estate umida.',
        averageCosts: { meal: '€8-20', transport: '€1-5/giorno', accommodation: '€30-80/notte' },
        gettingAround: ['Subte (metro)', 'Bus (SUBE card)', 'Uber/Cabify'],
        tipsFromLocals: ['Porta dollari in contanti (cambio blue)', 'Cena dopo le 21', 'Le milonghe aprono a mezzanotte']
      },
      'riodejaneiro': {
        documents: 'Passaporto valido. Visto non richiesto fino a 90 giorni per UE.',
        bestTimeToVisit: 'Maggio-ottobre (inverno mite). Carnevale: febbraio/marzo.',
        averageCosts: { meal: '€6-18', transport: '€2-8/giorno', accommodation: '€30-100/notte' },
        gettingAround: ['Metro pulita', 'Uber sicuro', 'A piedi nelle zone turistiche'],
        tipsFromLocals: ['Non ostentare oggetti di valore', 'Prenota il Cristo Redentore online', 'Copacabana di notte: attenzione']
      },
      'cusco': {
        documents: 'Passaporto valido. Visto non richiesto fino a 90 giorni per UE.',
        bestTimeToVisit: 'Aprile-ottobre (stagione secca). Machu Picchu: prenota mesi prima.',
        averageCosts: { meal: '€4-12', transport: '€1-5/giorno', accommodation: '€15-60/notte' },
        gettingAround: ['A piedi nel centro', 'Colectivos per Valle Sacra', 'Taxi economici'],
        tipsFromLocals: ['Acclimatati 1-2 giorni (3400m altitudine)', 'Coca tea per il mal di montagna', 'Boleto Turistico per i siti']
      },
      'cartagena': {
        documents: 'Passaporto valido. Visto non richiesto fino a 90 giorni per UE.',
        bestTimeToVisit: 'Dicembre-aprile (secco). Evita settembre-novembre (piogge).',
        averageCosts: { meal: '€5-15', transport: '€2-8/giorno', accommodation: '€30-100/notte' },
        gettingAround: ['A piedi nella città murata', 'Uber/taxi', 'Barca per le isole'],
        tipsFromLocals: ['Baratta con i venditori di spiaggia', 'Crema solare aggressiva', 'Zanzare al tramonto']
      },
      // ===== OCEANIA =====
      'sydney': {
        documents: 'Passaporto valido + eVisitor (gratuito online).',
        bestTimeToVisit: 'Settembre-novembre e marzo-maggio. Estate (dic-feb) calda.',
        averageCosts: { meal: '€15-35', transport: '€5-20/giorno', accommodation: '€80-200/notte' },
        gettingAround: ['Opal card (treni, bus, ferry)', 'Ferry per Manly (scenic)', 'A piedi nel CBD'],
        tipsFromLocals: ['Crema solare sempre (buco ozono)', 'Domenica: Opal cap €2.80', 'Surf lessons a Bondi!']
      },
      'melbourne': {
        documents: 'Passaporto valido + eVisitor (gratuito online).',
        bestTimeToVisit: 'Marzo-maggio e settembre-novembre. "4 stagioni in un giorno".',
        averageCosts: { meal: '€12-30', transport: '€5-15/giorno', accommodation: '€70-180/notte' },
        gettingAround: ['Tram gratuito nel CBD', 'Myki card', 'A piedi nelle laneway'],
        tipsFromLocals: ['Porta strati (meteo pazzo)', 'Café: ordina flat white', 'AFL match: esperienza locale']
      },
      'queenstown': {
        documents: 'Passaporto valido + NZeTA (17 NZD + IVL 35 NZD).',
        bestTimeToVisit: 'Tutto l\'anno! Estate per trekking, inverno per sci.',
        averageCosts: { meal: '€15-35', transport: '€10-50/giorno', accommodation: '€80-200/notte' },
        gettingAround: ['Auto per esplorare', 'Shuttle per piste da sci', 'A piedi in centro'],
        tipsFromLocals: ['Prenota attività avventura in anticipo', 'Milford Sound: vai con bel tempo', 'Fergburger: vai alle 3 di notte']
      },
      'fiji': {
        documents: 'Passaporto valido 6+ mesi. Visto gratuito all\'arrivo (4 mesi).',
        bestTimeToVisit: 'Maggio-ottobre (inverno secco). Evita stagione cicloni (nov-apr).',
        averageCosts: { meal: '€10-30', transport: '€20-50/giorno', accommodation: '€50-300/notte' },
        gettingAround: ['Barca/ferry tra le isole', 'Bus (Fiji Express)', 'Transfer prenotati'],
        tipsFromLocals: ['Porta cash (isole remote)', 'Reef shoes per le spiagge', 'Rispetta il villaggio (chiedi permesso)']
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
        thumbnailImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1534274867514-d5b47ef89ed7?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1543429257-3eb0b65d9c58?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1586163981567-6ee14bcbd52d?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1559511260-66a68eee9b9f?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1583531172067-57601cf3e1b3?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
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
        thumbnailImage: 'https://images.unsplash.com/photo-1584699173240-30a80ded5c68?w=1200&q=80',
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

