import { Component, OnInit, signal, computed, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CityService } from '../../core/services/city.service';
import { UserService } from '../../core/services/user.service';
import { PersonalizationService } from '../../core/services/personalization.service';
import { CityDetails, CitySection, City, CityLiveData } from '../../core/models/city.model';
import { CityCardComponent } from '../../shared/components/city-card/city-card.component';
import { WeatherService, WeatherData, WeatherForecast } from '../../core/services/api/weather.service';
import { WikipediaService, WikipediaSummary } from '../../core/services/api/wikipedia.service';
import { CountryService, CountryInfo } from '../../core/services/api/country.service';
import { UnsplashService, UnsplashPhoto } from '../../core/services/api/unsplash.service';
import { OpenTripMapService, CategorizedPlace } from '../../core/services/api/opentripmap.service';
import { FoursquareService, PlaceWithPhotos } from '../../core/services/api/foursquare.service';
import { forkJoin } from 'rxjs';

// Interface per i video di viaggio (YouTube)
export interface TravelVideo {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  views: number;
}

/**
 * CityComponent - The storytelling city experience
 * 
 * Design Philosophy:
 * - Progressive narrative: introduce → discover → explore
 * - Each section is a chapter in the city's story
 * - Non-intrusive storytelling: always serving clarity
 * 
 * "L'utente vive un percorso di scoperta"
 */
@Component({
  selector: 'app-city',
  standalone: true,
  imports: [CommonModule, RouterModule, CityCardComponent],
  template: `
    @if (loading()) {
      <div class="loading-state">
        <div class="loader"></div>
        <p>Preparando il tuo viaggio...</p>
      </div>
    } @else if (city()) {
      <main class="city-page">
        <!-- Hero Section - Emotional Introduction -->
        <section class="hero">
          <div class="hero-image">
            <img 
              [src]="city()!.thumbnailImage || city()!.heroImage" 
              [alt]="city()!.name"
              loading="eager">
            <div class="hero-overlay"></div>
          </div>
          
          <div class="hero-content">
            <div class="hero-breadcrumb animate-fade-in">
              <a routerLink="/">Home</a>
              <span class="separator">/</span>
              <a routerLink="/destinations">Destinazioni</a>
              <span class="separator">/</span>
              <span>{{ city()!.continent }}</span>
            </div>

            <div class="hero-text animate-fade-in-up">
              <h1 class="city-title">{{ city()!.name }}</h1>
              <p class="location">
                {{ city()!.country }}
              </p>
              <p class="tagline">{{ city()!.tagline }}</p>
            </div>

            <div class="hero-meta animate-fade-in-up animate-delay-1">
              <!-- Live Weather -->
              @if (weather()) {
                <div class="meta-item weather-live">
                  <span class="meta-value">
                    <span class="weather-icon">{{ weather()!.icon }}</span>
                    {{ weather()!.temperature }}°C
                  </span>
                  <span class="meta-label">{{ weather()!.description }}</span>
                </div>
              } @else if (weatherLoading()) {
                <div class="meta-item">
                  <span class="meta-value skeleton-text">--°C</span>
                  <span class="meta-label">Meteo in caricamento...</span>
                </div>
              }
              <div class="meta-item">
                <span class="meta-value">★ {{ city()!.rating.toFixed(1) }}</span>
                <span class="meta-label">Valutazione</span>
              </div>
              <div class="meta-item">
                <span class="meta-value">{{ city()!.suggestedDays.min }}-{{ city()!.suggestedDays.max }}</span>
                <span class="meta-label">Giorni consigliati</span>
              </div>
              <div class="meta-item">
                <span class="meta-value">{{ getPriceLevel() }}</span>
                <span class="meta-label">Costo medio</span>
              </div>
              <div class="meta-item">
                <span class="meta-value">{{ city()!.bestPeriod.slice(0, 2).join(', ') }}</span>
                <span class="meta-label">Periodo migliore</span>
              </div>
            </div>

            <div class="hero-actions animate-fade-in-up animate-delay-2">
              @if (userService.isAuthenticated()) {
                <button 
                  class="btn btn-primary btn-lg"
                  [class.saved]="isSaved()"
                  (click)="toggleSave()">
                  @if (isSaved()) {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    Salvata
                  } @else {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    Salva
                  }
                </button>
              }
              <button class="btn btn-secondary btn-lg" (click)="scrollToSection('overview')">
                Inizia l'esplorazione
              </button>
            </div>
          </div>

          <div class="scroll-hint animate-fade-in animate-delay-3">
            <span>Scorri per scoprire</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </div>
        </section>

        <!-- Story Introduction -->
        <section class="story-intro" id="overview">
          <div class="container">
            <div class="story-grid">
              <div class="story-content animate-fade-in-up">
                <span class="story-label">La Storia</span>
                <h2>{{ details()!.story.intro }}</h2>
                
                <!-- Wikipedia Summary (live) -->
                @if (wikipedia()) {
                  <p class="story-wiki">{{ wikipedia()!.extract | slice:0:500 }}...</p>
                  <a [href]="wikipedia()!.contentUrls.desktop" target="_blank" rel="noopener" class="wiki-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Leggi di più su Wikipedia
                  </a>
                } @else {
                <p class="story-atmosphere">{{ details()!.story.atmosphere }}</p>
                }
                
                <!-- Unique Aspect Card -->
                <div class="unique-card">
                  <div class="unique-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
              </div>
                  <div class="unique-content">
                    <span class="unique-label">Cosa la rende unica</span>
                    <p>{{ details()!.story.uniqueAspect }}</p>
                  </div>
                </div>

                <!-- Atmosphere Card -->
                @if (wikipedia()) {
                  <div class="atmosphere-card">
                    <div class="atmosphere-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-highlight)" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        <circle cx="12" cy="12" r="1" fill="var(--color-highlight)"/>
                      </svg>
                    </div>
                    <div class="atmosphere-content">
                      <span class="atmosphere-label">L'atmosfera</span>
                      <p>{{ details()!.story.atmosphere }}</p>
                    </div>
                  </div>
                }

                <!-- Quick Stats -->
                <div class="quick-stats">
                  <div class="stat-item">
                    <span class="stat-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-highlight)" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </span>
                    <span class="stat-value">{{ city()!.rating.toFixed(1) }}</span>
                    <span class="stat-label">Rating</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </span>
                    <span class="stat-value">{{ city()!.suggestedDays.min }}-{{ city()!.suggestedDays.max }}</span>
                    <span class="stat-label">Giorni ideali</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                    </span>
                    <span class="stat-value">{{ '€'.repeat(city()!.priceLevel) }}</span>
                    <span class="stat-label">Costo</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                        <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>
                      </svg>
                    </span>
                    <span class="stat-value">{{ city()!.bestPeriod[0] }}</span>
                    <span class="stat-label">Periodo migliore</span>
                  </div>
                </div>
              </div>

              <div class="story-side animate-fade-in-up animate-delay-1">
                <!-- Weather Forecast Card -->
                @if (forecast() && forecast()!.daily.length > 0) {
                  <div class="weather-card">
                    <div class="weather-header">
                      <h4>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17 18a5 5 0 0 0-10 0"/>
                          <line x1="12" y1="9" x2="12" y2="2"/>
                          <line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/>
                          <line x1="1" y1="18" x2="3" y2="18"/>
                          <line x1="21" y1="18" x2="23" y2="18"/>
                          <line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/>
                        </svg>
                        Previsioni Meteo
                      </h4>
                      @if (weather()) {
                        <span class="current-temp">{{ weather()!.temperature }}°C</span>
                      }
                    </div>
                    <div class="forecast-grid">
                      @for (day of forecast()!.daily.slice(0, 5); track day.date) {
                        <div class="forecast-day">
                          <span class="day-name">{{ getDayName(day.date) }}</span>
                          <span class="day-icon">{{ day.icon }}</span>
                          <span class="day-temp">{{ day.tempMax }}°/{{ day.tempMin }}°</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Traveller Types -->
                <div class="traveller-types">
                  <h4>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Perfetta per
                  </h4>
                  <div class="type-tags">
                    @for (type of details()!.story.travellerTypes; track type) {
                      <span class="type-tag">{{ type }}</span>
                    }
                  </div>
                </div>

                <!-- Country Info Card -->
                <div class="country-card">
                  <h4>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    Informazioni Paese
                  </h4>
                  <div class="country-info-grid">
                    @if (countryInfo()) {
                      <div class="country-item">
                        <span class="country-flag">{{ countryInfo()!.flag }}</span>
                        <div class="country-detail">
                          <span class="country-label">Paese</span>
                          <span class="country-value">{{ countryInfo()!.name }}</span>
                  </div>
                  </div>
                      <div class="country-item">
                        <span class="country-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                        </span>
                        <div class="country-detail">
                          <span class="country-label">Popolazione</span>
                          <span class="country-value">{{ formatPopulation(countryInfo()!.population) }}</span>
                  </div>
                </div>
                      <div class="country-item">
                        <span class="country-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                        </span>
                        <div class="country-detail">
                          <span class="country-label">Valuta</span>
                          <span class="country-value">
                            @if (countryInfo()!.currencies.length > 0) {
                              {{ countryInfo()!.currencies[0].symbol }} {{ countryInfo()!.currencies[0].name }}
                            } @else {
                              {{ city()!.currency }}
                            }
                          </span>
                        </div>
                      </div>
                      <div class="country-item">
                        <span class="country-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                            <path d="M9 11h6"/>
                          </svg>
                        </span>
                        <div class="country-detail">
                          <span class="country-label">Lingue</span>
                          <span class="country-value">{{ getLanguagesDisplay(countryInfo()!.languages) }}</span>
                        </div>
                      </div>
                      <div class="country-item">
                        <span class="country-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                        </span>
                        <div class="country-detail">
                          <span class="country-label">Fuso orario</span>
                          <span class="country-value">{{ city()!.timezone }}</span>
                        </div>
                      </div>
                      <div class="country-item">
                        <span class="country-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                            <path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2M19 18h2a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2M7 8h10M7 12h10M7 16h10"/>
                            <path d="M9 18v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2"/>
                          </svg>
                        </span>
                        <div class="country-detail">
                          <span class="country-label">Guida</span>
                          <span class="country-value">{{ countryInfo()!.drivingSide === 'right' ? 'A destra' : 'A sinistra' }}</span>
                        </div>
                      </div>
                      <div class="country-item">
                        <span class="country-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                        </span>
                        <div class="country-detail">
                          <span class="country-label">Prefisso</span>
                          <span class="country-value">{{ countryInfo()!.callingCode }}</span>
                        </div>
                      </div>
                      <div class="country-item">
                        <span class="country-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                        </span>
                        <div class="country-detail">
                          <span class="country-label">Emergenze</span>
                          <span class="country-value">{{ city()!.emergencyNumber }}</span>
                        </div>
                      </div>
                    } @else {
                      <div class="country-item">
                        <span class="country-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                            <path d="M9 11h6"/>
                          </svg>
                        </span>
                        <div class="country-detail">
                          <span class="country-label">Lingue</span>
                          <span class="country-value">{{ city()!.language.join(', ') }}</span>
                        </div>
                      </div>
                      <div class="country-item">
                        <span class="country-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                        </span>
                        <div class="country-detail">
                          <span class="country-label">Valuta</span>
                          <span class="country-value">{{ city()!.currency }}</span>
                        </div>
                      </div>
                      <div class="country-item">
                        <span class="country-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                        </span>
                        <div class="country-detail">
                          <span class="country-label">Fuso orario</span>
                          <span class="country-value">{{ city()!.timezone }}</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Safety Badge -->
                <div class="safety-badge" [class]="details()!.safety.overallLevel">
                  <span class="safety-icon">
                    @switch (details()!.safety.overallLevel) {
                      @case ('very-safe') {
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      }
                      @case ('safe') {
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      }
                      @case ('moderate') {
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      }
                      @case ('caution') {
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      }
                      @case ('avoid') {
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      }
                    }
                  </span>
                  <div class="safety-content">
                    <span class="safety-label">Sicurezza</span>
                    <span class="safety-level">{{ getSafetyLabel() }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Navigation Tabs -->
        <nav class="section-nav" [class.stuck]="navStuck()">
          <div class="container">
            <div class="nav-scroll">
              <button 
                class="nav-tab nav-tab-start"
                (click)="scrollToTop()"
                title="Torna all'inizio">
                <span class="tab-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </span>
                <span class="tab-label">Inizio</span>
              </button>
              @for (section of details()!.sections; track section.id) {
                <button 
                  class="nav-tab"
                  [class.active]="activeSection() === section.id"
                  (click)="setActiveSection(section.id)">
                  <span class="tab-icon">
                    @switch (section.icon) {
                      @case ('👁️') {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      }
                      @case ('🍴') {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4M9 5V3a1 1 0 0 1 1h4a1 1 0 0 1 1v2"/>
                        </svg>
                      }
                      @case ('📜') {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      }
                      @case ('📄') {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      }
                      @case ('🏛️') {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>
                          <path d="M9 9v0M9 12v0M9 15v0M9 18v0"/>
                        </svg>
                      }
                      @default {
                        <span>{{ section.icon }}</span>
                      }
                    }
                  </span>
                  <span class="tab-label">{{ section.title }}</span>
                </button>
              }
            </div>
          </div>
        </nav>

        <!-- Back to Top Button -->
        @if (navStuck()) {
          <button class="back-to-top" (click)="scrollToTop()" aria-label="Torna all'inizio">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          </button>
        }

        <!-- Content Sections -->
        <div class="sections-container">
          @for (section of details()!.sections; track section.id) {
            <section 
              class="content-section"
              [id]="section.id"
              [class.active]="activeSection() === section.id">
              <div class="container">
                <div class="section-header">
                  <span class="section-icon">
                    @switch (section.icon) {
                      @case ('👁️') {
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      }
                      @case ('🍴') {
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                          <path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4M9 5V3a1 1 0 0 1 1h4a1 1 0 0 1 1v2"/>
                        </svg>
                      }
                      @case ('📜') {
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      }
                      @case ('📄') {
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      }
                      @case ('🏛️') {
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                          <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>
                          <path d="M9 9v0M9 12v0M9 15v0M9 18v0"/>
                        </svg>
                      }
                      @default {
                        <span>{{ section.icon }}</span>
                      }
                    }
                  </span>
                  <h2>{{ section.title }}</h2>
                </div>
                
                <div class="section-items">
                  @for (item of section.items; track item.id; let i = $index) {
                    <article 
                      class="item-card animate-fade-in-up"
                      [class.has-image]="item.image"
                      [style.animation-delay.ms]="i * 100"
                      (click)="trackSectionExplored(section.id)">
                      @if (item.image) {
                        <div class="item-image">
                          <img 
                            [src]="item.image" 
                            [alt]="item.title"
                            loading="lazy"
                            (error)="onImageError($event)">
                        </div>
                      }
                      <div class="item-content">
                        <h3>{{ item.title }}</h3>
                        <p>{{ item.description }}</p>
                        <div class="item-meta">
                          @if (item.duration) {
                            <span class="meta-tag">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                              </svg>
                              {{ item.duration }}
                            </span>
                          }
                          @if (item.priceRange) {
                            <span class="meta-tag">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="1" x2="12" y2="23"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                              </svg>
                              {{ item.priceRange }}
                            </span>
                          }
                          @if (item.location) {
                            <span class="meta-tag">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                              </svg>
                              {{ item.location }}
                            </span>
                          }
                        </div>
                      </div>
                    </article>
                  }
                </div>
              </div>
            </section>
          }

          <!-- Practical Info Section -->
          <section 
            class="content-section practical-section"
            id="practical"
            [class.active]="activeSection() === 'practical'">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </span>
                <h2>Informazioni Pratiche</h2>
              </div>

              <div class="practical-grid">
                <div class="practical-card animate-fade-in-up">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    Documenti
                  </h3>
                  <p>{{ details()!.practicalInfo.documents }}</p>
                </div>

                <div class="practical-card animate-fade-in-up animate-delay-1">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-highlight)" stroke-width="2">
                      <circle cx="12" cy="12" r="5"/>
                      <line x1="12" y1="1" x2="12" y2="3"/>
                      <line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1" y1="12" x2="3" y2="12"/>
                      <line x1="21" y1="12" x2="23" y2="12"/>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                    Periodo Migliore
                  </h3>
                  <p>{{ details()!.practicalInfo.bestTimeToVisit }}</p>
                </div>

                <div class="practical-card animate-fade-in-up animate-delay-2">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    Costi Medi
                  </h3>
                  <ul class="cost-list">
                    <li><span>Pasto:</span> {{ details()!.practicalInfo.averageCosts.meal }}</li>
                    <li><span>Trasporti:</span> {{ details()!.practicalInfo.averageCosts.transport }}</li>
                    <li><span>Alloggio:</span> {{ details()!.practicalInfo.averageCosts.accommodation }}</li>
                  </ul>
                </div>

                <div class="practical-card animate-fade-in-up animate-delay-3">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                      <path d="M19 17h2l.64-2.54A6 6 0 0 0 20 10a6 6 0 0 0-6-6h-1.26a6 6 0 0 0-4.48 2L5 8a6 6 0 0 0-6 6v3h2"/>
                      <circle cx="7" cy="17" r="2"/>
                      <circle cx="17" cy="17" r="2"/>
                    </svg>
                    Come Muoversi
                  </h3>
                  <ul>
                    @for (tip of details()!.practicalInfo.gettingAround; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>

                <div class="practical-card full-width animate-fade-in-up animate-delay-4">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-highlight)" stroke-width="2">
                      <path d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0z"/>
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/>
                      <path d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                    </svg>
                    Consigli dai Locali
                  </h3>
                  <div class="tips-grid">
                    @for (tip of details()!.practicalInfo.tipsFromLocals; track tip) {
                      <div class="tip-item">
                        <span class="tip-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-highlight)" stroke-width="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </span>
                        <span>{{ tip }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Safety Section -->
          <section class="content-section safety-section">
            <div class="container">
              <div class="safety-card">
                <div class="safety-header">
                  <span class="safety-level" [attr.data-level]="details()!.safety.overallLevel">
                    {{ getSafetyLabel() }}
                  </span>
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Sicurezza
                  </h3>
                </div>
                
                @if (details()!.safety.currentAlerts.length > 0) {
                  <div class="alerts">
                    @for (alert of details()!.safety.currentAlerts; track alert) {
                      <div class="alert-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        {{ alert }}
                      </div>
                    }
                  </div>
                }

                <div class="safety-grid">
                  <div class="safety-item">
                    <h4>Consigli Salute</h4>
                    <ul>
                      @for (tip of details()!.safety.healthTips; track tip) {
                        <li>{{ tip }}</li>
                      }
                    </ul>
                  </div>
                  <div class="safety-item">
                    <h4>Truffe da Evitare</h4>
                    <ul>
                      @for (scam of details()!.safety.scamsToAvoid; track scam) {
                        <li>{{ scam }}</li>
                      }
                    </ul>
                  </div>
                </div>

                <div class="emergency-contacts">
                  <span>Emergenze:</span>
                  <span>Polizia {{ details()!.safety.emergencyContacts.police }}</span>
                  <span>Medico {{ details()!.safety.emergencyContacts.medical }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Live Attractions from OpenTripMap -->
        @if (attractions().length > 0) {
          <section class="live-section attractions-section">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="6"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </span>
                <div>
                  <h2>Attrazioni da non perdere</h2>
                  <span class="live-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Dati in tempo reale
                  </span>
                </div>
              </div>
              <div class="places-grid">
                @for (place of attractions().slice(0, 8); track place.id; let i = $index) {
                  <div class="place-card" [style.animation-delay.ms]="i * 50">
                    <div class="place-icon">{{ getCategoryIcon(place.category) }}</div>
                    <div class="place-info">
                      <h4>{{ place.name }}</h4>
                      <div class="place-meta">
                        <span class="place-category">{{ getCategoryLabel(place.category) }}</span>
                        <span class="place-rating">
                          @for (star of [1,2,3,4,5]; track star) {
                            <span [class.filled]="star <= place.rating">★</span>
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </section>
        }

        <!-- Live Restaurants from OpenTripMap -->
        @if (restaurants().length > 0) {
          <section class="live-section restaurants-section">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                    <path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4M9 5V3a1 1 0 0 1 1h4a1 1 0 0 1 1v2"/>
                  </svg>
                </span>
                <div>
                  <h2>Dove mangiare</h2>
                  <span class="live-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Dati in tempo reale
                  </span>
                </div>
              </div>
              <div class="places-grid restaurants-grid">
                @for (place of restaurants().slice(0, 6); track place.id; let i = $index) {
                  <div class="place-card restaurant-card" [style.animation-delay.ms]="i * 50">
                    <div class="place-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                        <path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4M9 5V3a1 1 0 0 1 1h4a1 1 0 0 1 1v2"/>
                      </svg>
                    </div>
                    <div class="place-info">
                      <h4>{{ place.name }}</h4>
                      <div class="place-meta">
                        <span class="place-rating">
                          @for (star of [1,2,3,4,5]; track star) {
                            <span [class.filled]="star <= place.rating">★</span>
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </section>
        }

        <!-- Video Travel Section - YouTube embeds (no login required) -->
        @if (travelVideos().length > 0) {
          <section class="viral-section">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </span>
                <div>
                  <h2>Video da {{ city()!.name }}</h2>
                  <span class="viral-subtitle">Scopri la città attraverso gli occhi dei viaggiatori</span>
                </div>
              </div>
              
              <!-- Video Grid -->
              <div class="video-grid">
                @for (video of travelVideos(); track video.id; let i = $index) {
                  <div class="video-card" [style.animation-delay.ms]="i * 100">
                    <div class="video-embed">
                      <iframe 
                        [src]="getYouTubeEmbedUrl(video.videoId)" 
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen
                        referrerpolicy="strict-origin-when-cross-origin">
                      </iframe>
                    </div>
                    <div class="video-info">
                      <h4 class="video-title">{{ video.title }}</h4>
                      <div class="video-meta">
                        <span class="video-creator">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                          </svg>
                          {{ video.channel }}
                        </span>
                        <span class="video-views">{{ formatViews(video.views) }} views</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </section>
        }

        <!-- Viral Content Links (fallback) -->
        @if (travelVideos().length === 0 && details()!.viralContent.length > 0) {
          <section class="viral-section">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </span>
                <h2>Trending sui Social</h2>
              </div>
              <div class="viral-grid">
                @for (content of details()!.viralContent; track content.id) {
                  <a 
                    [href]="content.externalUrl" 
                    target="_blank" 
                    rel="noopener"
                    class="viral-card"
                    (click)="trackExternalClick('viral', content.platform)">
                    <div class="viral-badge">
                      @switch (content.platform) {
                        @case ('tiktok') {
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                        }
                        @case ('instagram') {
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                          </svg>
                        }
                        @case ('youtube') {
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        }
                        @default {
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                        }
                      }
                    </div>
                    <div class="viral-info">
                      <span class="viral-title">{{ content.title }}</span>
                      <span class="viral-meta">{{ content.creator }} · {{ content.views }} views</span>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        <!-- Flight Deals -->
        @if (details()!.flightDeals.length > 0) {
          <section class="deals-section">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                  </svg>
                </span>
                <h2>Offerte Voli</h2>
              </div>
              <div class="deals-grid">
                @for (deal of details()!.flightDeals; track deal.id) {
                  <a 
                    [href]="deal.redirectUrl" 
                    target="_blank" 
                    rel="noopener"
                    class="deal-card"
                    (click)="trackExternalClick('flight', deal.provider)">
                    <div class="deal-price">
                      <span class="price">{{ deal.currency }} {{ deal.price }}</span>
                      <span class="price-label">da</span>
                    </div>
                    <div class="deal-info">
                      <span class="deal-route">{{ deal.departureCity }} → {{ city()!.name }}</span>
                      <span class="deal-dates">{{ deal.dates }}</span>
                    </div>
                    <span class="deal-provider">{{ deal.provider }}</span>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        <!-- Photo Gallery from Unsplash -->
        @if (photos().length > 1) {
          <section class="gallery-section">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                    <circle cx="7" cy="7" r="1"/>
                    <line x1="16" y1="13" x2="12" y2="9"/>
                    <line x1="12" y1="9" x2="8" y2="13"/>
                  </svg>
                </span>
                <h2>Galleria Fotografica</h2>
              </div>
              <div class="gallery-grid">
                @for (photo of photos().slice(1, 7); track photo.id; let i = $index) {
                  <a 
                    class="gallery-item"
                    [class.large]="i === 0"
                    [href]="photo.links.html"
                    target="_blank"
                    rel="noopener"
                    [style.animation-delay.ms]="i * 100">
                    <img 
                      [src]="getOptimizedPhotoUrl(photo, i === 0 ? 800 : 400)" 
                      [alt]="photo.altDescription || city()!.name"
                      loading="lazy">
                    <div class="gallery-overlay">
                      <span class="gallery-credit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                          <circle cx="7" cy="7" r="1"/>
                          <line x1="16" y1="13" x2="12" y2="9"/>
                          <line x1="12" y1="9" x2="8" y2="13"/>
                        </svg>
                        {{ photo.user.name }}
                      </span>
                    </div>
                  </a>
                }
              </div>
              <p class="gallery-attribution">
                Foto di alta qualità fornite da 
                <a href="https://unsplash.com/?utm_source=travelstory&utm_medium=referral" target="_blank" rel="noopener">
                  Unsplash
                </a>
              </p>
            </div>
          </section>
        }

        <!-- Real Photos from Foursquare -->
        @if (foursquareAttractions().length > 0 || foursquareRestaurants().length > 0) {
          <section class="foursquare-section">
            <div class="container">
              <!-- Attractions with real photos -->
              @if (foursquareAttractions().length > 0) {
                <div class="foursquare-category">
                  <div class="section-header">
                    <span class="section-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>
                        <path d="M9 9v0M9 12v0M9 15v0M9 18v0"/>
                      </svg>
                    </span>
                    <h2>Attrazioni da Visitare</h2>
                    <span class="powered-by">Foto reali da Foursquare</span>
                  </div>
                  <div class="foursquare-grid">
                    @for (place of foursquareAttractions(); track place.fsq_id; let i = $index) {
                      <div class="foursquare-card" [style.animation-delay.ms]="i * 80">
                        @if (place.mainPhotoUrl) {
                          <div class="foursquare-image">
                            <img [src]="place.mainPhotoUrl" [alt]="place.name" loading="lazy">
                          </div>
                        } @else {
                          <div class="foursquare-image placeholder">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-300)" stroke-width="1.5">
                              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>
                              <path d="M9 9v0M9 12v0M9 15v0M9 18v0"/>
                            </svg>
                          </div>
                        }
                        <div class="foursquare-info">
                          <h4>{{ place.name }}</h4>
                          @if (place.location.formatted_address) {
                            <p class="foursquare-address">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                              </svg>
                              {{ place.location.formatted_address }}
                            </p>
                          }
                          @if (place.categories.length > 0) {
                            <span class="foursquare-category-tag">{{ place.categories[0].name }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Restaurants with real photos -->
              @if (foursquareRestaurants().length > 0) {
                <div class="foursquare-category">
                  <div class="section-header">
                    <span class="section-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                        <path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4M9 5V3a1 1 0 0 1 1h4a1 1 0 0 1 1v2"/>
                      </svg>
                    </span>
                    <h2>Dove Mangiare</h2>
                    <span class="powered-by">Ristoranti reali da Foursquare</span>
                  </div>
                  <div class="foursquare-grid">
                    @for (place of foursquareRestaurants(); track place.fsq_id; let i = $index) {
                      <div class="foursquare-card" [style.animation-delay.ms]="i * 80">
                        @if (place.mainPhotoUrl) {
                          <div class="foursquare-image">
                            <img [src]="place.mainPhotoUrl" [alt]="place.name" loading="lazy">
                          </div>
                        } @else {
                          <div class="foursquare-image placeholder">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-300)" stroke-width="1.5">
                              <path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4M9 5V3a1 1 0 0 1 1h4a1 1 0 0 1 1v2"/>
                            </svg>
                          </div>
                        }
                        <div class="foursquare-info">
                          <h4>{{ place.name }}</h4>
                          @if (place.location.formatted_address) {
                            <p class="foursquare-address">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                              </svg>
                              {{ place.location.formatted_address }}
                            </p>
                          }
                          @if (place.categories.length > 0) {
                            <span class="foursquare-category-tag">{{ place.categories[0].name }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- Similar Cities -->
        @if (similarCities().length > 0) {
          <section class="similar-section">
            <div class="container">
              <div class="section-header">
                <h2>Destinazioni Simili</h2>
                <p class="section-subtitle">Ti potrebbe piacere anche</p>
              </div>
              <div class="similar-grid">
                @for (similar of similarCities(); track similar.id) {
                  <app-city-card [city]="similar" />
                }
              </div>
            </div>
          </section>
        }
      </main>
    } @else {
      <div class="error-state">
        <h2>Città non trovata</h2>
        <p>La destinazione che cerchi non esiste o è stata rimossa.</p>
        <a routerLink="/" class="btn btn-primary">Torna alla Home</a>
      </div>
    }
  `,
  styles: [`
    // ===== LOADING & ERROR STATES =====
    .loading-state,
    .error-state {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--space-8);
    }

    .loader {
      width: 48px;
      height: 48px;
      border: 3px solid var(--color-gray-200);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: var(--space-4);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    // ===== HERO =====
    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: var(--space-8);
      padding-bottom: var(--space-16);
    }

    .hero-image {
      position: absolute;
      inset: 0;
      z-index: -1;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.8) 0%,
        rgba(0, 0, 0, 0.3) 50%,
        rgba(0, 0, 0, 0.2) 100%
      );
    }

    .photo-credit {
      position: absolute;
      bottom: var(--space-3);
      right: var(--space-3);
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-3);
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      border-radius: var(--border-radius-full);
      font-size: var(--text-xs);
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      transition: all var(--transition-fast);
      z-index: 10;

      &:hover {
        background: rgba(0, 0, 0, 0.7);
        color: white;
      }
    }

    .hero-content {
      max-width: var(--max-width);
      margin: 0 auto;
      width: 100%;
      color: white;
    }

    .hero-breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      margin-bottom: var(--space-6);
      opacity: 0.8;

      a:hover {
        text-decoration: underline;
      }

      .separator {
        opacity: 0.5;
      }
    }

    .hero-text {
      margin-bottom: var(--space-8);

      .city-title {
        font-family: var(--font-display);
        font-size: clamp(3.5rem, 8vw + 1rem, 7rem);
        font-weight: 700;
        line-height: 1;
        letter-spacing: 0.02em;
        color: #ffffff;
        text-shadow: 
          0 0 20px rgba(0, 0, 0, 0.8),
          0 0 40px rgba(0, 0, 0, 0.6),
          0 2px 4px rgba(0, 0, 0, 0.9),
          0 4px 8px rgba(0, 0, 0, 0.7),
          0 8px 16px rgba(0, 0, 0, 0.5);
        animation: slideInLeft 0.8s ease-out 0.2s both;
        position: relative;
        display: inline-block;
        margin-bottom: var(--space-8);
        text-transform: none;
        font-style: normal;
        
        @media (min-width: 768px) {
          margin-bottom: var(--space-12);
        }
        
        // Decorative underline
        &::after {
          content: '';
          position: absolute;
          bottom: -0.15em;
          left: 0;
          width: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--color-highlight) 0%, var(--color-accent) 100%);
          animation: underlineExpand 0.8s ease-out 0.6s forwards;
          box-shadow: 0 0 10px rgba(248, 181, 0, 0.6);
        }
      }

      .location {
        font-size: var(--text-lg);
        opacity: 0.9;
        margin-bottom: var(--space-4);
        animation: fadeInUp 0.8s ease-out 0.4s both;
        font-weight: 400;
      }

      .tagline {
        font-size: var(--text-xl);
        font-style: italic;
        opacity: 0.85;
        max-width: 600px;
        animation: fadeInUp 0.8s ease-out 0.5s both;
      }
    }
    
    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes underlineExpand {
      from {
        width: 0;
      }
      to {
        width: 100%;
      }
    }

    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      margin-bottom: var(--space-8);
      padding: var(--space-5);
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      border-radius: var(--border-radius-xl);
      border: 1px solid rgba(255, 255, 255, 0.2);
      width: fit-content;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-3);
      background: rgba(255, 255, 255, 0.05);
      border-radius: var(--border-radius-md);
      transition: all var(--transition-fast);
      min-width: 100px;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }

      .meta-value {
        font-size: var(--text-lg);
        font-weight: 700;
        color: white;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .meta-label {
        font-size: var(--text-xs);
        opacity: 0.85;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
      }
    }

    .hero-actions {
      display: flex;
      gap: var(--space-3);
    }

    .scroll-hint {
      position: absolute;
      bottom: var(--space-8);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      color: white;
      opacity: 0.7;
      font-size: var(--text-sm);

      svg {
        animation: bounce 2s infinite;
      }

      @media (max-width: 768px) {
        display: none;
      }
    }

    // ===== STORY INTRO =====
    .story-intro {
      padding: var(--space-24) 0;
      background: var(--color-off-white);
    }

    .story-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--space-12);

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
        gap: var(--space-8);
      }
    }

    .story-content {
      .story-label {
        display: inline-block;
        font-size: var(--text-sm);
        font-weight: 500;
        color: var(--color-accent);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: var(--space-4);
      }

      h2 {
        font-size: var(--text-3xl);
        line-height: 1.3;
        margin-bottom: var(--space-6);
      }

      .story-atmosphere {
        font-size: var(--text-lg);
        color: var(--color-gray-500);
        margin-bottom: var(--space-4);
      }
    }

    // Unique Card
    .unique-card {
      display: flex;
      gap: var(--space-4);
      background: linear-gradient(135deg, rgba(233, 69, 96, 0.08) 0%, rgba(248, 181, 0, 0.05) 100%);
      border-left: 4px solid var(--color-accent);
      padding: var(--space-5);
      border-radius: var(--border-radius-lg);
      margin: var(--space-6) 0;

      .unique-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-accent);
        border-radius: 50%;
        flex-shrink: 0;

        svg {
          stroke: white;
          fill: white;
        }
      }

      .unique-content {
        .unique-label {
          display: block;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-accent);
          margin-bottom: var(--space-1);
        }

        p {
          margin: 0;
          color: var(--color-gray-600);
          line-height: 1.6;
        }
      }
    }

    // Atmosphere Card
    .atmosphere-card {
      display: flex;
      gap: var(--space-4);
      background: var(--color-white);
      padding: var(--space-5);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-sm);
      margin-bottom: var(--space-6);

      .atmosphere-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        flex-shrink: 0;
        
        svg {
          width: 28px;
          height: 28px;
        }
      }

      .atmosphere-content {
        .atmosphere-label {
          display: block;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-primary);
          margin-bottom: var(--space-1);
        }

        p {
          margin: 0;
          color: var(--color-gray-500);
          font-style: italic;
          line-height: 1.6;
        }
      }
    }

    // Quick Stats
    .quick-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-3);
      margin-top: var(--space-2);

      @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: var(--space-4);
        background: var(--color-white);
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-sm);
        transition: transform var(--transition-fast);

        &:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-2);
          
          svg {
            width: 24px;
            height: 24px;
          }
        }

        .stat-value {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--color-primary);
          margin-bottom: 2px;
        }

        .stat-label {
          font-size: var(--text-xs);
        color: var(--color-gray-400);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
      }
    }

    .story-side {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .traveller-types {
      background: var(--color-white);
      padding: var(--space-5);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-sm);

      h4 {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-sm);
        color: var(--color-primary);
        margin-bottom: var(--space-3);

        svg {
          stroke: var(--color-accent);
        }
      }
    }

    .type-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .type-tag {
      padding: var(--space-2) var(--space-3);
      background: linear-gradient(135deg, rgba(233, 69, 96, 0.1) 0%, rgba(248, 181, 0, 0.08) 100%);
      border-radius: var(--border-radius-full);
      font-size: var(--text-sm);
      color: var(--color-gray-600);
      font-weight: 500;
    }

    // Country Info Card
    .country-card {
      background: var(--color-white);
      padding: var(--space-5);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-sm);

      h4 {
      display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-sm);
        color: var(--color-primary);
        margin-bottom: var(--space-4);

        svg {
          stroke: var(--color-accent);
        }
      }
    }

    .country-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
    }

    .country-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);

      .country-flag {
        font-size: 24px;
      }

      .country-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        flex-shrink: 0;
        
        svg {
          width: 18px;
          height: 18px;
        }
      }

      .country-detail {
        display: flex;
        flex-direction: column;
        gap: 0;
        min-width: 0;

        .country-label {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--color-gray-400);
          letter-spacing: 0.02em;
        }

        .country-value {
          font-size: var(--text-sm);
          color: var(--color-gray-600);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    // Safety Badge
    .safety-badge {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
      border-radius: var(--border-radius-lg);
      background: var(--color-white);
      box-shadow: var(--shadow-sm);

      .safety-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        
        svg {
          width: 24px;
          height: 24px;
        }
      }

      .safety-content {
        display: flex;
        flex-direction: column;

        .safety-label {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--color-gray-400);
          letter-spacing: 0.02em;
        }

        .safety-level {
      font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-gray-600);
        }
      }

      &.very-safe, &.safe {
        border-left: 4px solid #22c55e;
        
        .safety-level {
          color: #16a34a;
        }
      }

      &.moderate, &.caution {
        border-left: 4px solid #f59e0b;
        
        .safety-level {
          color: #d97706;
        }
      }

      &.avoid {
        border-left: 4px solid #ef4444;
        
        .safety-level {
          color: #dc2626;
        }
      }
    }

    // Weather in hero
    .weather-live {
      .weather-icon {
        font-size: 1.4em;
        margin-right: var(--space-1);
      }
      }

    .skeleton-text {
      background: linear-gradient(90deg, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    // Wikipedia Link
    .story-wiki {
      font-size: var(--text-base);
        color: var(--color-gray-500);
      line-height: 1.7;
      margin-bottom: var(--space-3);
    }

    .wiki-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-accent);
      font-weight: 500;
      margin-bottom: var(--space-4);
      padding: var(--space-2) var(--space-3);
      background: rgba(233, 69, 96, 0.08);
      border-radius: var(--border-radius-md);
      transition: all var(--transition-fast);
      
      svg {
        stroke: var(--color-accent);
      }

      &:hover {
        background: rgba(233, 69, 96, 0.15);
        transform: translateX(4px);
      }
    }

    // Weather Forecast Card
    .weather-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: var(--space-5);
      border-radius: var(--border-radius-lg);
      color: white;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

      .weather-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-4);

        h4 {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-sm);
          color: rgba(255,255,255,0.9);
          margin: 0;

          svg {
            stroke: rgba(255,255,255,0.9);
          }
        }

        .current-temp {
          font-size: var(--text-2xl);
          font-weight: 700;
        }
      }
    }

    .forecast-grid {
      display: flex;
      justify-content: space-between;
      gap: var(--space-2);
    }

    .forecast-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
      flex: 1;
      padding: var(--space-2);
      background: rgba(255,255,255,0.1);
      border-radius: var(--border-radius-sm);

      .day-name {
        font-size: var(--text-xs);
        opacity: 0.8;
      }

      .day-icon {
        font-size: 1.3rem;
      }

      .day-temp {
        font-size: var(--text-xs);
        font-weight: 500;
      }
    }

    // ===== SECTION NAV =====
    .section-nav {
      position: sticky;
      top: 0;
      z-index: calc(var(--z-sticky) - 1);
      background: var(--color-white);
      border-bottom: 1px solid var(--color-gray-100);
      transition: box-shadow var(--transition-base);

      &.stuck {
        box-shadow: var(--shadow-md);
      }
    }

    // ===== BACK TO TOP BUTTON =====
    .back-to-top {
      position: fixed;
      bottom: var(--space-6);
      right: var(--space-6);
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-accent);
      color: white;
      border: none;
      border-radius: var(--border-radius-full);
      box-shadow: var(--shadow-lg);
      cursor: pointer;
      z-index: var(--z-dropdown);
      transition: all var(--transition-base);
      animation: fadeInUp 0.3s ease-out;

      &:hover {
        background: var(--color-primary);
        transform: translateY(-4px);
        box-shadow: var(--shadow-xl);
      }

      &:active {
        transform: translateY(-2px);
      }

      svg {
        stroke: white;
      }

      @media (max-width: 768px) {
        bottom: var(--space-4);
        right: var(--space-4);
        width: 44px;
        height: 44px;
      }
    }

    .nav-scroll {
      display: flex;
      gap: var(--space-1);
      overflow-x: auto;
      padding: var(--space-2) 0;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .nav-tab {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: none;
      border: none;
      border-radius: var(--border-radius-full);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-gray-500);
      white-space: nowrap;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-cream);
        color: var(--color-primary);
      }

      &.active {
        background: var(--color-primary);
        color: white;
      }

      &.nav-tab-start {
        background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-highlight) 100%);
        color: white;
        font-weight: 600;
        margin-right: var(--space-2);
        box-shadow: 0 2px 8px rgba(233, 69, 96, 0.2);

        &:hover {
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
        }

        .tab-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          
          svg {
            width: 18px;
            height: 18px;
          }
        }
      }
    }

    // ===== CONTENT SECTIONS =====
    .content-section {
      padding: var(--space-16) 0;

      &:nth-child(even) {
        background: var(--color-cream);
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-8);

      .section-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        flex-shrink: 0;
        
        svg {
          width: 24px;
          height: 24px;
        }
      }

      h2 {
        font-size: var(--text-2xl);
        margin: 0;
      }
    }

    .section-items {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-6);
    }

    .item-card {
      background: var(--color-white);
      border-radius: var(--border-radius-lg);
      overflow: hidden;
      transition: all var(--transition-base);
      cursor: pointer;

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
      }
    }

    .item-image {
      aspect-ratio: 16/9;
      overflow: hidden;
      background: linear-gradient(135deg, var(--color-gray-100) 0%, var(--color-gray-200) 100%);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform var(--transition-base);
      }

      .image-placeholder {
        width: 100%;
        height: 100%;
      }
    }

    .item-card.has-image:hover .item-image img {
      transform: scale(1.05);
    }

    .item-content {
      padding: var(--space-5);

      h3 {
        font-size: var(--text-lg);
        margin-bottom: var(--space-2);
      }

      p {
        font-size: var(--text-sm);
        color: var(--color-gray-500);
        margin-bottom: var(--space-3);
      }
    }

    .item-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .meta-tag {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      background: var(--color-cream);
      border-radius: var(--border-radius-sm);
      font-size: var(--text-xs);
      color: var(--color-gray-500);
      
      svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        stroke: var(--color-accent);
      }
    }

    // ===== PRACTICAL SECTION =====
    .practical-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-4);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .practical-card {
      background: var(--color-white);
      padding: var(--space-6);
      border-radius: var(--border-radius-lg);

      &.full-width {
        grid-column: 1 / -1;
      }

      h3 {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-lg);
        margin-bottom: var(--space-3);
        
        svg {
          flex-shrink: 0;
        }
      }

      ul {
        list-style: none;

        li {
          padding: var(--space-2) 0;
          color: var(--color-gray-500);
          border-bottom: 1px solid var(--color-gray-100);

          &:last-child {
            border: none;
          }
        }
      }
    }

    .cost-list li {
      display: flex;
      justify-content: space-between;

      span:first-child {
        color: var(--color-gray-400);
      }
    }

    .tips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: var(--space-3);
    }

    .tip-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      color: var(--color-gray-500);

      .tip-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        
        svg {
          width: 16px;
          height: 16px;
        }
      }
    }

    // ===== SAFETY SECTION =====
    .safety-section {
      background: var(--color-off-white);
    }

    .safety-card {
      background: var(--color-white);
      padding: var(--space-8);
      border-radius: var(--border-radius-xl);
    }

    .safety-header {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-6);

      h3 {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin: 0;
        
        svg {
          flex-shrink: 0;
        }
      }
    }

    .safety-level {
      padding: var(--space-2) var(--space-4);
      border-radius: var(--border-radius-full);
      font-size: var(--text-sm);
      font-weight: 600;

      &[data-level="very-safe"],
      &[data-level="safe"] {
        background: rgba(46, 204, 113, 0.1);
        color: #27ae60;
      }

      &[data-level="moderate"] {
        background: rgba(241, 196, 15, 0.1);
        color: #f39c12;
      }

      &[data-level="caution"],
      &[data-level="avoid"] {
        background: rgba(231, 76, 60, 0.1);
        color: #c0392b;
      }
    }

    .alerts {
      margin-bottom: var(--space-6);

      .alert-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3);
        background: rgba(241, 196, 15, 0.1);
        border-radius: var(--border-radius-sm);
        font-size: var(--text-sm);
        color: #856404;
        
        svg {
          flex-shrink: 0;
        }
      }
    }

    .safety-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-6);
      margin-bottom: var(--space-6);

      @media (max-width: 576px) {
        grid-template-columns: 1fr;
      }

      h4 {
        font-size: var(--text-base);
        margin-bottom: var(--space-3);
      }

      ul {
        list-style: none;

        li {
          padding: var(--space-2) 0;
          color: var(--color-gray-500);
          font-size: var(--text-sm);

          &::before {
            content: '•';
            margin-right: var(--space-2);
            color: var(--color-gray-300);
          }
        }
      }
    }

    .emergency-contacts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-gray-100);
      font-size: var(--text-sm);
      color: var(--color-gray-500);
    }

    // ===== VIRAL SECTION =====
    .viral-section {
      padding: var(--space-16) 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: white;

      h2 {
        color: white;
      }

      .section-header > div {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
    }

    .viral-subtitle {
      font-size: var(--text-sm);
      opacity: 0.7;
    }

    // Video Grid (YouTube)
    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: var(--space-6);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .video-card {
      background: rgba(255, 255, 255, 0.08);
      border-radius: var(--border-radius-xl);
      overflow: hidden;
      animation: fadeInUp 0.5s ease both;
      transition: all var(--transition-base);

      &:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-4px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }
    }

    .video-embed {
      aspect-ratio: 16/9;
      background: #000;
      position: relative;

      iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
    }

    .video-info {
      padding: var(--space-4);
      background: rgba(0, 0, 0, 0.2);
    }

    .video-title {
      font-size: var(--text-base);
      font-weight: 500;
      margin: 0 0 var(--space-2) 0;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .video-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .video-creator {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      opacity: 0.8;

      svg {
        opacity: 0.7;
      }
    }

    .video-views {
      font-size: var(--text-xs);
      opacity: 0.6;
      background: rgba(255, 255, 255, 0.1);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--border-radius-full);
    }

    .viral-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
    }

    .viral-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: rgba(255, 255, 255, 0.1);
      border-radius: var(--border-radius-lg);
      transition: all var(--transition-base);

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        color: white;
      }
    }

    .viral-badge {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
      border-radius: var(--border-radius-md);
      
      svg {
        width: 24px;
        height: 24px;
      }
    }

    .viral-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .viral-title {
      font-weight: 500;
    }

    .viral-meta {
      font-size: var(--text-xs);
      opacity: 0.7;
    }

    // ===== DEALS SECTION =====
    .deals-section {
      padding: var(--space-16) 0;
    }

    .deals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
    }

    .deal-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--color-white);
      border: 1px solid var(--color-gray-100);
      border-radius: var(--border-radius-lg);
      transition: all var(--transition-base);

      &:hover {
        border-color: var(--color-accent);
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
        color: inherit;
      }
    }

    .deal-price {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-right: var(--space-4);
      border-right: 1px solid var(--color-gray-100);

      .price {
        font-size: var(--text-xl);
        font-weight: 700;
        color: var(--color-accent);
      }

      .price-label {
        font-size: var(--text-xs);
        color: var(--color-gray-400);
      }
    }

    .deal-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .deal-route {
      font-weight: 500;
    }

    .deal-dates {
      font-size: var(--text-sm);
      color: var(--color-gray-400);
    }

    .deal-provider {
      font-size: var(--text-xs);
      color: var(--color-gray-400);
      background: var(--color-cream);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--border-radius-sm);
    }

    // ===== PHOTO GALLERY =====
    .gallery-section {
      padding: var(--space-16) 0;
      background: var(--color-off-white);
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(2, 200px);
      gap: var(--space-3);
      margin-bottom: var(--space-4);

      @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(3, 150px);
      }
    }

    .gallery-item {
      position: relative;
      overflow: hidden;
      border-radius: var(--border-radius-lg);
      cursor: pointer;
      animation: fadeInUp 0.5s ease both;

      &.large {
        grid-column: span 2;
        grid-row: span 2;

        @media (max-width: 768px) {
          grid-column: span 2;
          grid-row: span 1;
        }
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform var(--transition-base);
      }

      &:hover img {
        transform: scale(1.05);
      }

      &:hover .gallery-overlay {
        opacity: 1;
      }
    }

    .gallery-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%);
      display: flex;
      align-items: flex-end;
      padding: var(--space-3);
      opacity: 0;
      transition: opacity var(--transition-fast);
    }

    .gallery-credit {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-xs);
      color: white;
      
      svg {
        flex-shrink: 0;
      }
    }

    .gallery-attribution {
      text-align: center;
      font-size: var(--text-sm);
      color: var(--color-gray-400);

      a {
        color: var(--color-accent);
        font-weight: 500;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    // ===== FOURSQUARE REAL PHOTOS =====
    .foursquare-section {
      padding: var(--space-16) 0;
      background: linear-gradient(180deg, #f9f8f6 0%, var(--color-off-white) 100%);
    }

    .foursquare-category {
      margin-bottom: var(--space-12);

      &:last-child {
        margin-bottom: 0;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-6);
        flex-wrap: wrap;

        h2 {
          margin: 0;
          flex-grow: 1;
        }
      }

      .powered-by {
        font-size: var(--text-xs);
        color: var(--color-gray-400);
        background: rgba(0, 0, 0, 0.05);
        padding: 4px 10px;
        border-radius: var(--border-radius-full);
      }
    }

    .foursquare-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4);

      @media (max-width: 992px) {
        grid-template-columns: repeat(3, 1fr);
      }

      @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }

    .foursquare-card {
      background: var(--color-white);
      border-radius: var(--border-radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-base);
      animation: fadeInUp 0.5s ease both;

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);

        .foursquare-image img {
          transform: scale(1.05);
        }
      }
    }

    .foursquare-image {
      aspect-ratio: 4/3;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform var(--transition-base);
      }

      &.placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--color-cream) 0%, var(--color-off-white) 100%);

        .placeholder-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.4;
          
          svg {
            width: 48px;
            height: 48px;
          }
        }
      }
    }

    .foursquare-info {
      padding: var(--space-3) var(--space-4);

      h4 {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-primary);
        margin: 0 0 var(--space-1);
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }

    .foursquare-address {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      font-size: var(--text-xs);
      color: var(--color-gray-400);
      margin: 0 0 var(--space-2);
      line-height: 1.4;

      svg {
        flex-shrink: 0;
        margin-top: 2px;
      }
    }

    .foursquare-category-tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 500;
      color: var(--color-accent);
      background: rgba(233, 69, 96, 0.1);
      padding: 2px 8px;
      border-radius: var(--border-radius-full);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    // ===== LIVE SECTIONS (OpenTripMap) =====
    .live-section {
      padding: var(--space-16) 0;

      .section-header {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        margin-bottom: var(--space-8);

        > div {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        h2 {
          margin: 0;
        }
      }
    }

    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-xs);
      color: var(--color-accent);
      font-weight: 500;
    }

    .attractions-section {
      background: linear-gradient(180deg, var(--color-cream) 0%, var(--color-off-white) 100%);
    }

    .restaurants-section {
      background: var(--color-white);
    }

    .places-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
    }

    .restaurants-grid {
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }

    .place-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--color-white);
      border: 1px solid var(--color-gray-100);
      border-radius: var(--border-radius-lg);
      animation: fadeInUp 0.4s ease both;
      transition: all var(--transition-fast);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: var(--color-accent);
      }
    }

    .restaurant-card {
      background: linear-gradient(135deg, #fff5f5 0%, white 100%);
    }

    .place-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--color-cream);
      border-radius: var(--border-radius-md);
      flex-shrink: 0;
      
      svg {
        width: 24px;
        height: 24px;
      }
    }

    .place-info {
      flex: 1;
      min-width: 0;

      h4 {
        font-size: var(--text-base);
        font-weight: 500;
        margin: 0 0 var(--space-1) 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .place-meta {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .place-category {
      font-size: var(--text-xs);
      color: var(--color-gray-400);
      background: var(--color-gray-100);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--border-radius-sm);
    }

    .place-rating {
      display: flex;
      gap: 1px;
      font-size: var(--text-xs);

      span {
        color: var(--color-gray-200);
        
        &.filled {
          color: #f39c12;
        }
      }
    }

    // ===== SIMILAR SECTION =====
    .similar-section {
      padding: var(--space-16) 0;
      background: var(--color-cream);

      .section-subtitle {
        color: var(--color-gray-400);
        margin-top: var(--space-2);
      }
    }

    .similar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-6);
    }
  `]
})
export class CityComponent implements OnInit, OnDestroy {
  // Services
  private weatherService = inject(WeatherService);
  private wikipediaService = inject(WikipediaService);
  private countryService = inject(CountryService);
  private unsplashService = inject(UnsplashService);
  private openTripMapService = inject(OpenTripMapService);
  private foursquareService = inject(FoursquareService);

  // State
  loading = signal(true);
  city = signal<CityDetails | null>(null);
  details = computed(() => this.city());
  activeSection = signal('see');
  navStuck = signal(false);
  similarCities = signal<City[]>([]);

  // Live API Data
  liveData = signal<CityLiveData>({});
  weatherLoading = signal(true);
  wikiLoading = signal(true);
  countryLoading = signal(true);
  photosLoading = signal(true);
  attractionsLoading = signal(true);
  restaurantsLoading = signal(true);
  foursquareLoading = signal(true);

  // Computed
  isSaved = computed(() => {
    const cityId = this.city()?.id;
    return cityId ? this.userService.isCitySaved(cityId) : false;
  });

  weather = computed(() => this.liveData().weather);
  forecast = computed(() => this.liveData().forecast);
  wikipedia = computed(() => this.liveData().wikipedia);
  countryInfo = computed(() => this.liveData().country);
  photos = computed(() => this.liveData().photos || []);
  heroPhoto = computed(() => this.photos().length > 0 ? this.photos()[0] : null);
  attractions = computed(() => this.liveData().attractions || []);
  restaurants = computed(() => this.liveData().restaurants || []);
  // Foursquare real photos
  foursquareAttractions = computed(() => this.liveData().foursquareAttractions || []);
  foursquareRestaurants = computed(() => this.liveData().foursquareRestaurants || []);

  // Travel Videos (YouTube)
  travelVideos = signal<TravelVideo[]>([]);
  private sanitizedUrls = new Map<string, SafeResourceUrl>();

  private scrollListener: (() => void) | null = null;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;
  private sanitizer = inject(DomSanitizer);
  private intersectionObserver: IntersectionObserver | null = null;

  constructor(
    private route: ActivatedRoute,
    private cityService: CityService,
    public userService: UserService,
    private personalization: PersonalizationService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const cityId = params.get('id');
      if (cityId) {
        this.loadCity(cityId);
      }
    });

    // Track scroll for sticky nav
    this.scrollListener = () => {
      this.navStuck.set(window.scrollY > 600);
    };
    window.addEventListener('scroll', this.scrollListener);
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  private loadCity(cityId: string): void {
    this.loading.set(true);
    this.weatherLoading.set(true);
    this.wikiLoading.set(true);
    this.countryLoading.set(true);
    
    // Load static city data
      const details = this.cityService.getCityDetails(cityId);
      
      if (details) {
        this.city.set(details);
        this.userService.trackCityVisit(cityId);
        this.similarCities.set(this.personalization.getSimilarCities(cityId, 4));
        
        // Start tracking time spent
        this.startTimeTracking(cityId);
      
      // Load live API data in parallel
      this.loadLiveData(details);
      
      // Load travel videos
      this.loadTravelVideos(details.name);
      
      // Setup section observer after content is loaded
      setTimeout(() => {
        this.setupSectionObserver();
      }, 100);
      }
      
      this.loading.set(false);
  }

  private loadLiveData(details: CityDetails): void {
    const { lat, lng } = details.coordinates;
    
    // Load weather data
    this.weatherService.getWeatherForecast(lat, lng).subscribe({
      next: (forecast) => {
        this.liveData.update(data => ({
          ...data,
          weather: forecast.current,
          forecast: forecast
        }));
        this.weatherLoading.set(false);
      },
      error: () => this.weatherLoading.set(false)
    });

    // Load Wikipedia summary
    this.wikipediaService.getCitySummary(details.name, details.country).subscribe({
      next: (wiki) => {
        if (wiki) {
          this.liveData.update(data => ({ ...data, wikipedia: wiki }));
        }
        this.wikiLoading.set(false);
      },
      error: () => this.wikiLoading.set(false)
    });

    // Load country info
    this.countryService.getCountryByName(details.country).subscribe({
      next: (country) => {
        if (country) {
          this.liveData.update(data => ({ ...data, country: country }));
        }
        this.countryLoading.set(false);
      },
      error: () => this.countryLoading.set(false)
    });

    // Load Unsplash photos
    this.unsplashService.getCityPhotos(details.name, details.country, 6).subscribe({
      next: (photos) => {
        if (photos.length > 0) {
          this.liveData.update(data => ({ ...data, photos }));
        }
        this.photosLoading.set(false);
      },
      error: () => this.photosLoading.set(false)
    });

    // Load attractions from OpenTripMap
    this.openTripMapService.getAttractions(lat, lng, 5000, 12).subscribe({
      next: (attractions) => {
        if (attractions.length > 0) {
          this.liveData.update(data => ({ ...data, attractions }));
        }
        this.attractionsLoading.set(false);
      },
      error: () => this.attractionsLoading.set(false)
    });

    // Load restaurants from OpenTripMap
    this.openTripMapService.getRestaurants(lat, lng, 3000, 8).subscribe({
      next: (restaurants) => {
        if (restaurants.length > 0) {
          this.liveData.update(data => ({ ...data, restaurants }));
        }
        this.restaurantsLoading.set(false);
      },
      error: () => this.restaurantsLoading.set(false)
    });

    // Load real photos from Foursquare
    this.foursquareService.getAttractionPhotos(details.name, lat, lng, 8).subscribe({
      next: (attractions) => {
        if (attractions.length > 0) {
          this.liveData.update(data => ({ ...data, foursquareAttractions: attractions }));
        }
      },
      error: (err) => console.error('Foursquare attractions error:', err)
    });

    this.foursquareService.getRestaurantPhotos(details.name, lat, lng, 8).subscribe({
      next: (restaurants) => {
        if (restaurants.length > 0) {
          this.liveData.update(data => ({ ...data, foursquareRestaurants: restaurants }));
        }
        this.foursquareLoading.set(false);
      },
      error: (err) => {
        console.error('Foursquare restaurants error:', err);
        this.foursquareLoading.set(false);
      }
    });
  }

  private startTimeTracking(cityId: string): void {
    // Track every 30 seconds
    this.trackingInterval = setInterval(() => {
      this.userService.trackCityVisit(cityId);
    }, 30000);
  }

  getPriceLevel(): string {
    const level = this.city()?.priceLevel || 3;
    const labels = ['Budget', 'Economico', 'Medio', 'Alto', 'Lusso'];
    return labels[level - 1];
  }

  getSafetyLabel(): string {
    const level = this.details()?.safety.overallLevel;
    const labels: Record<string, string> = {
      'very-safe': '✅ Molto sicura',
      'safe': '✅ Sicura',
      'moderate': '⚠️ Attenzione moderata',
      'caution': '⚠️ Cautela consigliata',
      'avoid': '🚫 Sconsigliata'
    };
    return labels[level || 'safe'];
  }

  getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      'tiktok': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>',
      'instagram': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
      'youtube': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
    };
    return icons[platform] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  }

  getSectionIcon(emoji: string): string {
    const iconMap: Record<string, string> = {
      '👁️': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      '🍴': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4M9 5V3a1 1 0 0 1 1h4a1 1 0 0 1 1v2"/></svg>',
      '📜': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
      '📄': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
      '🏛️': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v0M9 12v0M9 15v0M9 18v0"/></svg>'
    };
    return iconMap[emoji] || emoji;
  }

  setActiveSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    this.scrollToSection(sectionId);
  }

  private setupSectionObserver(): void {
    // Wait for content to be rendered
    setTimeout(() => {
      const sections = [
        { id: 'overview', element: document.getElementById('overview') },
        ...(this.details()?.sections.map(s => ({
          id: s.id,
          element: document.getElementById(s.id)
        })) || []),
        { id: 'practical', element: document.getElementById('practical') }
      ].filter(s => s.element !== null);

      if (sections.length === 0) return;

      // Create intersection observer
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          // Find the section that is most visible in the viewport
          let maxIntersection = 0;
          let activeId = this.activeSection();

          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > maxIntersection) {
              maxIntersection = entry.intersectionRatio;
              activeId = entry.target.id;
            }
          });

          // Only update if we found a better match and it's different from current
          if (maxIntersection > 0 && activeId !== this.activeSection()) {
            this.activeSection.set(activeId);
          }
        },
        {
          rootMargin: '-20% 0px -60% 0px', // Trigger when section is in upper 40% of viewport
          threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0]
        }
      );

      // Observe all sections
      sections.forEach(section => {
        if (section.element) {
          this.intersectionObserver?.observe(section.element);
        }
      });
    }, 500);
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for sticky nav
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Reset navStuck to ensure navbar reappears
    setTimeout(() => {
      this.navStuck.set(false);
    }, 100);
  }

  toggleSave(): void {
    const cityId = this.city()?.id;
    if (cityId) {
      if (this.isSaved()) {
        this.userService.unsaveCity(cityId);
      } else {
        this.userService.saveCity(cityId);
      }
    }
  }

  trackSectionExplored(sectionId: string): void {
    const cityId = this.city()?.id;
    if (cityId) {
      this.userService.trackSectionExplored(cityId, sectionId);
    }
  }

  trackExternalClick(type: string, target: string): void {
    const cityId = this.city()?.id;
    if (cityId) {
      this.userService.trackInteraction(cityId, {
        type: 'click_external',
        target: `${type}:${target}`
      });
    }
  }

  getDayName(date: Date): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return days[new Date(date).getDay()];
  }

  formatPopulation(population: number): string {
    if (population >= 1_000_000_000) {
      return `${(population / 1_000_000_000).toFixed(1)} miliardi`;
    }
    if (population >= 1_000_000) {
      return `${(population / 1_000_000).toFixed(1)} milioni`;
    }
    if (population >= 1_000) {
      return `${Math.round(population / 1_000)} mila`;
    }
    return population.toString();
  }

  getLanguagesDisplay(languages: Record<string, string>): string {
    const langValues = Object.values(languages);
    if (langValues.length === 0) return 'N/A';
    return langValues.slice(0, 2).join(', ');
  }

  getPhotoAttributionLink(photo: UnsplashPhoto): string {
    return this.unsplashService.getAttributionLink(photo);
  }

  getOptimizedPhotoUrl(photo: UnsplashPhoto, width: number): string {
    return this.unsplashService.getOptimizedUrl(photo, width);
  }

  getCategoryIcon(category: string): string {
    return this.openTripMapService.getCategoryIcon(category as any);
  }

  getCategoryLabel(category: string): string {
    return this.openTripMapService.getCategoryLabel(category as any);
  }

  // YouTube embed URL (sanitized) - no login required
  getYouTubeEmbedUrl(videoId: string): SafeResourceUrl {
    if (this.sanitizedUrls.has(videoId)) {
      return this.sanitizedUrls.get(videoId)!;
    }
    // YouTube embed with autoplay disabled and related videos from same channel
    const url = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    const sanitized = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.sanitizedUrls.set(videoId, sanitized);
    return sanitized;
  }

  // Format views count
  formatViews(views: number): string {
    if (views >= 1_000_000) {
      return `${(views / 1_000_000).toFixed(1)}M`;
    }
    if (views >= 1_000) {
      return `${Math.round(views / 1_000)}K`;
    }
    return views.toString();
  }

  // Handle image error - hide broken images
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.style.display = 'none';
    }
  }

  // Load travel videos for the city (YouTube - no login required)
  private loadTravelVideos(cityName: string): void {
    // Real YouTube video IDs for travel content - these play directly without login
    const cityVideos: Record<string, TravelVideo[]> = {
      'tokyo': [
        { id: '1', videoId: 'rSvBFm_MuXw', title: 'Tokyo Travel Guide - Top Things To Do', channel: 'Expedia', views: 2500000 },
        { id: '2', videoId: '6a0qLmscHf8', title: 'Tokyo in 8K Ultra HD', channel: 'Jacob + Katie Schwarz', views: 18000000 },
        { id: '3', videoId: 'BRv8JuFKFCQ', title: 'Street Food in Tokyo', channel: 'Best Ever Food Review', views: 4200000 },
      ],
      'paris': [
        { id: '1', videoId: 'AQ6GmpMu5L8', title: 'Paris Travel Guide - Must See Attractions', channel: 'Expedia', views: 3100000 },
        { id: '2', videoId: '_dZM5rWFVBs', title: 'Paris in 4K', channel: 'Amazing Places', views: 8500000 },
        { id: '3', videoId: 'Ka4Ey9T5VJk', title: 'Paris Food Tour', channel: 'Mark Wiens', views: 2900000 },
      ],
      'rome': [
        { id: '1', videoId: '7wHjKi-e0Ks', title: 'Rome Travel Guide', channel: 'Rick Steves', views: 4800000 },
        { id: '2', videoId: 'r1T2bqJQAq8', title: 'Rome in 4K', channel: 'Amazing Places', views: 6200000 },
        { id: '3', videoId: 'EbmFFBvl9mc', title: 'Best Roman Food', channel: 'Italia Squisita', views: 1800000 },
      ],
      'barcelona': [
        { id: '1', videoId: 'J-ZWqBfXLzk', title: 'Barcelona Travel Guide', channel: 'Expedia', views: 2100000 },
        { id: '2', videoId: 'D90_20WwDb0', title: 'Barcelona in 4K', channel: 'Amazing Places', views: 3500000 },
        { id: '3', videoId: 'tWuV-xdQ2Xo', title: 'Barcelona Food Guide', channel: 'Devour Tours', views: 890000 },
      ],
      'newyork': [
        { id: '1', videoId: 'MtCMtC50gwY', title: 'New York Travel Guide', channel: 'Expedia', views: 5500000 },
        { id: '2', videoId: 'e-4vp66b9II', title: 'NYC in 4K', channel: 'Jacob + Katie Schwarz', views: 12000000 },
        { id: '3', videoId: 'qBhXM_NDGcA', title: 'NYC Food Tour', channel: 'Strictly Dumpling', views: 3200000 },
      ],
      'bali': [
        { id: '1', videoId: 'OkvVr6n1cGk', title: 'Bali Travel Guide - 4K', channel: 'Lost LeBlanc', views: 4800000 },
        { id: '2', videoId: '_eMH9s7bX-A', title: 'Bali in 4K', channel: 'Amazing Places', views: 7200000 },
        { id: '3', videoId: 'vRDDSKtxqkM', title: 'Bali Food Guide', channel: 'Mark Wiens', views: 2400000 },
      ],
      'dubai': [
        { id: '1', videoId: 'HDs9xNb5ME0', title: 'Dubai Travel Guide', channel: 'Expedia', views: 3700000 },
        { id: '2', videoId: 'NI0UqZg_IAU', title: 'Dubai in 4K', channel: 'Amazing Places', views: 9800000 },
        { id: '3', videoId: 'nHAE4Mhiyfk', title: 'Dubai Food Tour', channel: 'Best Ever Food Review', views: 2100000 },
      ],
      'lisbon': [
        { id: '1', videoId: 'y6kHPFVPdHk', title: 'Lisbon Travel Guide', channel: 'Expedia', views: 1400000 },
        { id: '2', videoId: 'KJzMHv8pcuY', title: 'Lisbon in 4K', channel: 'Amazing Places', views: 2800000 },
        { id: '3', videoId: 'JG5cY4D7HCg', title: 'Lisbon Food Tour', channel: 'Mark Wiens', views: 980000 },
      ],
      'amsterdam': [
        { id: '1', videoId: 'CSW2q3TXGQ8', title: 'Amsterdam Travel Guide', channel: 'Expedia', views: 1800000 },
        { id: '2', videoId: 'WXGi5b5uCmA', title: 'Amsterdam in 4K', channel: 'Amazing Places', views: 4100000 },
        { id: '3', videoId: 'o_PBfLbd3zw', title: 'Dutch Food Tour', channel: 'Mark Wiens', views: 1200000 },
      ],
      'sydney': [
        { id: '1', videoId: '_v3kir51Cr0', title: 'Sydney Travel Guide', channel: 'Expedia', views: 2600000 },
        { id: '2', videoId: 'jPKQC9ZeOYM', title: 'Sydney in 4K', channel: 'Amazing Places', views: 5400000 },
        { id: '3', videoId: 'ZVfpI5Dy0J0', title: 'Sydney Food Guide', channel: 'Strictly Dumpling', views: 890000 },
      ],
      'kyoto': [
        { id: '1', videoId: 'awxZQ-W4RuA', title: 'Kyoto Travel Guide', channel: 'Rick Steves', views: 1900000 },
        { id: '2', videoId: 'GLvqH1B4GQ8', title: 'Kyoto in 4K', channel: 'Amazing Places', views: 3200000 },
        { id: '3', videoId: 'yLpbZZqbttI', title: 'Kyoto Food Tour', channel: 'TabiEats', views: 450000 },
      ],
      'bangkok': [
        { id: '1', videoId: 'E67uIxgfSxE', title: 'Bangkok Travel Guide', channel: 'Expedia', views: 2800000 },
        { id: '2', videoId: 'h1Zqw4-3cWY', title: 'Bangkok in 4K', channel: 'Amazing Places', views: 4500000 },
        { id: '3', videoId: 'DdhVHZrLgcw', title: 'Bangkok Street Food', channel: 'Mark Wiens', views: 8900000 },
      ],
      'singapore': [
        { id: '1', videoId: '0OvL2jCDr70', title: 'Singapore Travel Guide', channel: 'Expedia', views: 2100000 },
        { id: '2', videoId: 'UQq9aBxdb7U', title: 'Singapore in 4K', channel: 'Amazing Places', views: 3800000 },
        { id: '3', videoId: 'MKfIg_ZNEHA', title: 'Singapore Food Tour', channel: 'Mark Wiens', views: 4200000 },
      ],
    };

    const cityKey = cityName.toLowerCase().replace(/\s+/g, '');
    const videos = cityVideos[cityKey] || [];
    this.travelVideos.set(videos);
  }
}

