import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CityImagePopulatorService } from '../../core/services/city-image-populator.service';
import { CityEnricherService } from '../../core/services/city-enricher.service';
import { CityService } from '../../core/services/city.service';
import { CitySeederService } from '../../core/services/city-seeder.service';
import { DatabaseService } from '../../core/services/database.service';
import { City } from '../../core/models/city.model';

/**
 * AdminComponent
 * 
 * Componente admin per:
 * - Popolare immagini mancanti per le città esistenti
 * - Aggiungere nuove città al database
 * - Visualizzare lo stato delle immagini
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-page">
      <div class="container">
        <h1>Admin Panel - Gestione Città</h1>

        <!-- Populate Missing Images -->
        <section class="admin-section">
          <h2>Popola Immagini Mancanti</h2>
          <p>Riempie automaticamente le immagini mancanti per tutte le città usando Unsplash.</p>
          
          <div class="action-bar">
            <button 
              class="btn btn-primary" 
              [disabled]="populatingImages()"
              (click)="populateAllImages()">
              {{ populatingImages() ? 'Caricamento...' : 'Popola Tutte le Immagini' }}
            </button>
            <button 
              class="btn btn-secondary" 
              [disabled]="checkingImages()"
              (click)="checkMissingImages()">
              {{ checkingImages() ? 'Controllo...' : 'Verifica Immagini Mancanti' }}
            </button>
          </div>

          @if (imageResults().length > 0) {
            <div class="results">
              <h3>Risultati ({{ imageResults().length }})</h3>
              <div class="results-list">
                @for (result of imageResults(); track result.cityId) {
                  <div class="result-item" [class.success]="result.updated" [class.error]="result.error">
                    <strong>{{ result.cityId }}</strong>
                    @if (result.updated) {
                      <span class="badge success">✓ Aggiornato</span>
                      @if (result.thumbnailUrl) {
                        <div class="image-preview">
                          <img [src]="result.thumbnailUrl" alt="Thumbnail" style="max-width: 200px; height: auto;">
                        </div>
                      }
                    } @else if (result.error) {
                      <span class="badge error">✗ {{ result.error }}</span>
                    } @else {
                      <span class="badge">- Nessuna modifica</span>
                    }
                  </div>
                }
              </div>
            </div>
          }

          @if (missingImages().length > 0) {
            <div class="missing-images">
              <h3>Città con Immagini Mancanti ({{ missingImages().length }})</h3>
              <ul>
                @for (city of missingImages(); track city.id) {
                  <li>
                    <strong>{{ city.name }}</strong> ({{ city.country }})
                    <br>
                    <small>
                      Thumbnail: {{ city.thumbnailImage ? '✓' : '✗' }} | 
                      Hero: {{ city.heroImage ? '✓' : '✗' }}
                    </small>
                  </li>
                }
              </ul>
            </div>
          }
        </section>

        <!-- Database Seeding -->
        <section class="admin-section">
          <h2>Seeding Database</h2>
          <p>Popola automaticamente il database con {{ citiesToSeedCount() }} città arricchite da API esterne.</p>
          <p class="info-text">
            <strong>Nota:</strong> Questo processo può richiedere diversi minuti. 
            Ogni città viene arricchita con immagini (Unsplash), informazioni (Wikipedia), 
            e dati paese (RestCountries). Tutte le città avranno immagini garantite.
          </p>
          
          <div class="action-bar">
            <button 
              class="btn btn-primary" 
              [disabled]="seeding()"
              (click)="seedDatabase()">
              {{ seeding() ? `Seeding... ${seedingProgress()}` : 'Seeda Tutto il Database' }}
            </button>
            <button 
              class="btn btn-secondary" 
              [disabled]="checkingDatabase()"
              (click)="checkDatabaseStatus()">
              {{ checkingDatabase() ? 'Controllo...' : 'Verifica Stato Database' }}
            </button>
            <button 
              class="btn btn-danger" 
              [disabled]="clearingDatabase()"
              (click)="clearDatabase()">
              {{ clearingDatabase() ? 'Pulizia...' : 'Svuota Database' }}
            </button>
          </div>

          @if (databaseStatus()) {
            <div class="database-status">
              <h3>Stato Database</h3>
              <p><strong>Città nel database:</strong> {{ databaseStatus()?.cityCount || 0 }}</p>
              <p><strong>Database inizializzato:</strong> {{ databaseStatus()?.initialized ? 'Sì' : 'No' }}</p>
            </div>
          }

          @if (seedingResults().length > 0) {
            <div class="results">
              <h3>Risultati Seeding</h3>
              <p>
                <strong>Successo:</strong> {{ seedingSummary().success }} | 
                <strong>Falliti:</strong> {{ seedingSummary().failed }}
              </p>
              @if (seedingSummary().errors.length > 0) {
                <div class="errors-list">
                  <h4>Errori:</h4>
                  <ul>
                    @for (error of seedingSummary().errors; track error.city) {
                      <li><strong>{{ error.city }}:</strong> {{ error.error }}</li>
                    }
                  </ul>
                </div>
              }
            </div>
          }
        </section>

        <!-- Add New Cities -->
        <section class="admin-section">
          <h2>Aggiungi Nuove Città</h2>
          <p>Genera dati per città popolari da aggiungere al database.</p>
          
          <div class="action-bar">
            <button 
              class="btn btn-primary" 
              [disabled]="generatingCities()"
              (click)="generateNewCities()">
              {{ generatingCities() ? 'Generazione...' : 'Genera Città Popolari' }}
            </button>
          </div>

          @if (newCities().length > 0) {
            <div class="results">
              <h3>Città Generate ({{ newCities().length }})</h3>
              <div class="cities-preview">
                @for (city of newCities(); track city.id) {
                  <div class="city-preview">
                    <img [src]="city.thumbnailImage" [alt]="city.name" style="width: 100%; height: 150px; object-fit: cover;">
                    <div class="city-info">
                      <h4>{{ city.name }}</h4>
                      <p>{{ city.country }}, {{ city.continent }}</p>
                      <p><strong>Rating:</strong> {{ city.rating?.toFixed(1) }}</p>
                      <p><strong>Tags:</strong> {{ city.tags?.join(', ') }}</p>
                    </div>
                  </div>
                }
              </div>
              <div class="code-output">
                <h4>Codice da aggiungere a city.service.ts:</h4>
                <pre><code>{{ generateCityCode() }}</code></pre>
                <button class="btn btn-secondary" (click)="copyToClipboard()">Copia Codice</button>
              </div>
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .admin-page {
      min-height: 100vh;
      padding: var(--space-8);
      background: var(--color-off-white);
    }

    .admin-section {
      background: var(--color-white);
      padding: var(--space-6);
      border-radius: var(--border-radius-lg);
      margin-bottom: var(--space-6);
      box-shadow: var(--shadow-sm);

      h2 {
        margin-top: 0;
        color: var(--color-primary);
      }

      p {
        color: var(--color-gray-500);
        margin-bottom: var(--space-4);
      }
    }

    .action-bar {
      display: flex;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }

    .results {
      margin-top: var(--space-6);
      padding-top: var(--space-6);
      border-top: 1px solid var(--color-gray-200);

      h3 {
        margin-bottom: var(--space-4);
      }
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .result-item {
      padding: var(--space-3);
      background: var(--color-cream);
      border-radius: var(--border-radius-md);
      border-left: 4px solid var(--color-gray-300);

      &.success {
        border-left-color: #22c55e;
      }

      &.error {
        border-left-color: #ef4444;
      }
    }

    .badge {
      display: inline-block;
      padding: var(--space-1) var(--space-2);
      border-radius: var(--border-radius-sm);
      font-size: var(--text-xs);
      font-weight: 600;
      margin-left: var(--space-2);

      &.success {
        background: #dcfce7;
        color: #16a34a;
      }

      &.error {
        background: #fee2e2;
        color: #dc2626;
      }
    }

    .image-preview {
      margin-top: var(--space-2);
    }

    .missing-images {
      margin-top: var(--space-4);
      padding: var(--space-4);
      background: #fef3c7;
      border-radius: var(--border-radius-md);

      ul {
        list-style: none;
        padding: 0;
        margin: var(--space-2) 0 0 0;

        li {
          padding: var(--space-2) 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);

          &:last-child {
            border-bottom: none;
          }
        }
      }
    }

    .cities-preview {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }

    .city-preview {
      background: var(--color-white);
      border: 1px solid var(--color-gray-200);
      border-radius: var(--border-radius-md);
      overflow: hidden;

      .city-info {
        padding: var(--space-3);

        h4 {
          margin: 0 0 var(--space-1) 0;
        }

        p {
          margin: var(--space-1) 0;
          font-size: var(--text-sm);
          color: var(--color-gray-500);
        }
      }
    }

    .code-output {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: var(--space-4);
      border-radius: var(--border-radius-md);
      overflow-x: auto;

      h4 {
        color: #fff;
        margin-bottom: var(--space-3);
      }

      pre {
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: var(--text-sm);
        line-height: 1.5;
      }

      code {
        display: block;
        white-space: pre;
      }
    }

    .info-text {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: var(--space-3);
      border-radius: var(--border-radius-sm);
      margin-bottom: var(--space-4);
    }

    .database-status {
      margin-top: var(--space-4);
      padding: var(--space-4);
      background: #f0fdf4;
      border-radius: var(--border-radius-md);
      border: 1px solid #86efac;

      h3 {
        margin-top: 0;
        color: #16a34a;
      }

      p {
        margin: var(--space-2) 0;
        color: var(--color-gray-700);
      }
    }

    .errors-list {
      margin-top: var(--space-4);
      padding: var(--space-4);
      background: #fef2f2;
      border-radius: var(--border-radius-md);
      border: 1px solid #fca5a5;

      h4 {
        margin-top: 0;
        color: #dc2626;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: var(--space-2) 0 0 0;

        li {
          padding: var(--space-2) 0;
          border-bottom: 1px solid rgba(220, 38, 38, 0.2);

          &:last-child {
            border-bottom: none;
          }
        }
      }
    }

    .btn-danger {
      background: #ef4444;
      color: white;
      border: none;

      &:hover:not(:disabled) {
        background: #dc2626;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  `]
})
export class AdminComponent {
  private imagePopulator = inject(CityImagePopulatorService);
  private cityEnricher = inject(CityEnricherService);
  private cityService = inject(CityService);
  private citySeeder = inject(CitySeederService);
  private databaseService = inject(DatabaseService);

  populatingImages = signal(false);
  checkingImages = signal(false);
  generatingCities = signal(false);
  seeding = signal(false);
  checkingDatabase = signal(false);
  clearingDatabase = signal(false);
  seedingProgress = signal('');
  imageResults = signal<Array<{ cityId: string; updated: boolean; thumbnailUrl?: string; error?: string }>>([]);
  missingImages = signal<City[]>([]);
  newCities = signal<Partial<City>[]>([]);
  seedingResults = signal<Array<{ city: string; error: string }>>([]);
  databaseStatus = signal<{ cityCount: number; initialized: boolean } | null>(null);
  citiesToSeedCount = signal(0);

  constructor() {
    // Carica il numero di città da seedare
    this.citiesToSeedCount.set(this.citySeeder.getCitiesToSeed().length);
  }

  async populateAllImages() {
    this.populatingImages.set(true);
    this.imageResults.set([]);

    try {
      const results = await this.imagePopulator.populateMissingImages();
      this.imageResults.set(results);
    } catch (error) {
      console.error('Error populating images:', error);
    } finally {
      this.populatingImages.set(false);
    }
  }

  checkMissingImages() {
    this.checkingImages.set(true);
    const cities = this.cityService.getAllCities();
    
    const missing = cities.filter((city: City) => {
      const hasThumbnail = city.thumbnailImage && 
        !city.thumbnailImage.includes('placeholder') &&
        !city.thumbnailImage.includes('default');
      const hasHero = city.heroImage && 
        !city.heroImage.includes('placeholder') &&
        !city.heroImage.includes('default');
      
      return !hasThumbnail || !hasHero;
    });

    this.missingImages.set(missing);
    this.checkingImages.set(false);
  }

  async generateNewCities() {
    this.generatingCities.set(true);
    this.newCities.set([]);

    try {
      const cities = await this.cityEnricher.generateAllCitiesData();
      this.newCities.set(cities);
    } catch (error) {
      console.error('Error generating cities:', error);
    } finally {
      this.generatingCities.set(false);
    }
  }

  generateCityCode(): string {
    const cities = this.newCities();
    if (cities.length === 0) return '';

    // Genera codice TypeScript per aggiungere le città
    let code = '// Aggiungi queste città al database\n';
    code += '// Nota: Dovrai aggiungere anche i dettagli completi (story, sections, etc.)\n\n';

    cities.forEach(city => {
      code += `{\n`;
      code += `  id: '${city.id}',\n`;
      code += `  name: '${city.name}',\n`;
      code += `  country: '${city.country}',\n`;
      code += `  continent: '${city.continent}',\n`;
      code += `  tagline: '${city.tagline}',\n`;
      code += `  heroImage: '${city.heroImage}',\n`;
      code += `  thumbnailImage: '${city.thumbnailImage}',\n`;
      code += `  coordinates: { lat: ${city.coordinates?.lat}, lng: ${city.coordinates?.lng} },\n`;
      code += `  tags: [${city.tags?.map(t => `'${t}'`).join(', ')}],\n`;
      code += `  rating: ${city.rating?.toFixed(1)},\n`;
      code += `  popularityScore: ${city.popularityScore},\n`;
      code += `  priceLevel: ${city.priceLevel},\n`;
      code += `  suggestedDays: { min: ${city.suggestedDays?.min}, max: ${city.suggestedDays?.max} },\n`;
      code += `  bestPeriod: [${city.bestPeriod?.map(p => `'${p}'`).join(', ')}],\n`;
      code += `  language: [${city.language?.map(l => `'${l}'`).join(', ')}],\n`;
      code += `  currency: '${city.currency}',\n`;
      code += `  timezone: '${city.timezone}',\n`;
      code += `  emergencyNumber: '${city.emergencyNumber}'\n`;
      code += `},\n\n`;
    });

    return code;
  }

  async copyToClipboard() {
    const code = this.generateCityCode();
    try {
      await navigator.clipboard.writeText(code);
      alert('Codice copiato negli appunti!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }

  /**
   * Seeda tutto il database con città arricchite
   */
  async seedDatabase() {
    this.seeding.set(true);
    this.seedingResults.set([]);
    this.seedingProgress.set('Inizio...');

    try {
      const result = await this.citySeeder.seedAllCities((cityName, current, total) => {
        this.seedingProgress.set(`${cityName} (${current}/${total})`);
      });

      this.seedingResults.set(result.errors);
      
      // Aggiorna il servizio città
      await this.cityService.refreshCities();
      
      // Mostra risultato
      alert(`Seeding completato!\nSuccesso: ${result.success}\nFalliti: ${result.failed}`);
    } catch (error) {
      console.error('Error seeding database:', error);
      alert('Errore durante il seeding del database');
    } finally {
      this.seeding.set(false);
      this.seedingProgress.set('');
    }
  }

  /**
   * Verifica lo stato del database
   */
  async checkDatabaseStatus() {
    this.checkingDatabase.set(true);
    
    try {
      await this.databaseService.initialize();
      const cityCount = await this.databaseService.getCityCount();
      const hasCities = await this.databaseService.hasCities();
      
      this.databaseStatus.set({
        cityCount,
        initialized: true
      });
    } catch (error) {
      console.error('Error checking database status:', error);
      this.databaseStatus.set({
        cityCount: 0,
        initialized: false
      });
    } finally {
      this.checkingDatabase.set(false);
    }
  }

  /**
   * Svuota il database
   */
  async clearDatabase() {
    if (!confirm('Sei sicuro di voler svuotare il database? Questa azione non può essere annullata.')) {
      return;
    }

    this.clearingDatabase.set(true);
    
    try {
      await this.databaseService.clearAll();
      await this.cityService.refreshCities();
      this.databaseStatus.set({ cityCount: 0, initialized: true });
      alert('Database svuotato con successo');
    } catch (error) {
      console.error('Error clearing database:', error);
      alert('Errore durante la pulizia del database');
    } finally {
      this.clearingDatabase.set(false);
    }
  }

  /**
   * Ottiene il riepilogo del seeding
   */
  seedingSummary(): { success: number; failed: number; errors: Array<{ city: string; error: string }> } {
    const errors = this.seedingResults();
    const total = this.citiesToSeedCount();
    const failed = errors.length;
    const success = total - failed;
    
    return { success, failed, errors };
  }
}

