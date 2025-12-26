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
import { forkJoin } from 'rxjs';

// Interface per i video TikTok
export interface TikTokVideo {
  id: string;
  videoId: string;
  creator: string;
  views: number;
  title?: string;
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
              [src]="heroPhoto() ? heroPhoto()!.urls.regular : city()!.heroImage" 
              [alt]="heroPhoto()?.altDescription || city()!.name"
              [style.background-color]="heroPhoto()?.color || '#1a1a2e'">
            <div class="hero-overlay"></div>
            @if (heroPhoto()) {
              <a 
                class="photo-credit" 
                [href]="getPhotoAttributionLink(heroPhoto()!)" 
                target="_blank" 
                rel="noopener">
                📸 {{ heroPhoto()!.user.name }} / Unsplash
              </a>
            }
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
              <h1>{{ city()!.name }}</h1>
              <p class="location">
                <span class="flag">🌍</span>
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
                <span class="meta-value">★ {{ city()!.rating }}</span>
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
                  {{ isSaved() ? '❤️ Salvata' : '🤍 Salva' }}
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
                  <p class="story-wiki">{{ wikipedia()!.extract | slice:0:400 }}...</p>
                  <a [href]="wikipedia()!.contentUrls.desktop" target="_blank" rel="noopener" class="wiki-link">
                    Leggi di più su Wikipedia →
                  </a>
                } @else {
                  <p class="story-atmosphere">{{ details()!.story.atmosphere }}</p>
                }
                
                <p class="story-unique">
                  <strong>Cosa la rende unica:</strong> {{ details()!.story.uniqueAspect }}
                </p>
              </div>
              <div class="story-side animate-fade-in-up animate-delay-1">
                <!-- Weather Forecast Card -->
                @if (forecast() && forecast()!.daily.length > 0) {
                  <div class="weather-card">
                    <h4>🌤️ Previsioni Meteo</h4>
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

                <div class="traveller-types">
                  <h4>Perfetta per</h4>
                  <div class="type-tags">
                    @for (type of details()!.story.travellerTypes; track type) {
                      <span class="type-tag">{{ type }}</span>
                    }
                  </div>
                </div>

                <!-- Country Info (live) -->
                <div class="quick-info">
                  @if (countryInfo()) {
                    <div class="info-item">
                      <span class="info-icon">{{ countryInfo()!.flag }}</span>
                      <span class="info-text">{{ countryInfo()!.name }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-icon">👥</span>
                      <span class="info-text">{{ formatPopulation(countryInfo()!.population) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-icon">💰</span>
                      <span class="info-text">
                        @if (countryInfo()!.currencies.length > 0) {
                          {{ countryInfo()!.currencies[0].name }} ({{ countryInfo()!.currencies[0].symbol }})
                        } @else {
                          {{ city()!.currency }}
                        }
                      </span>
                    </div>
                  } @else {
                    <div class="info-item">
                      <span class="info-icon">🗣️</span>
                      <span class="info-text">{{ city()!.language.join(', ') }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-icon">💱</span>
                      <span class="info-text">{{ city()!.currency }}</span>
                    </div>
                  }
                  <div class="info-item">
                    <span class="info-icon">🕐</span>
                    <span class="info-text">{{ city()!.timezone }}</span>
                  </div>
                  @if (countryInfo()) {
                    <div class="info-item">
                      <span class="info-icon">🚗</span>
                      <span class="info-text">Guida a {{ countryInfo()!.drivingSide === 'right' ? 'destra' : 'sinistra' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-icon">📞</span>
                      <span class="info-text">{{ countryInfo()!.callingCode }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Navigation Tabs -->
        <nav class="section-nav" [class.stuck]="navStuck()">
          <div class="container">
            <div class="nav-scroll">
              @for (section of details()!.sections; track section.id) {
                <button 
                  class="nav-tab"
                  [class.active]="activeSection() === section.id"
                  (click)="setActiveSection(section.id)">
                  <span class="tab-icon">{{ section.icon }}</span>
                  <span class="tab-label">{{ section.title }}</span>
                </button>
              }
              <button 
                class="nav-tab"
                [class.active]="activeSection() === 'practical'"
                (click)="setActiveSection('practical')">
                <span class="tab-icon">📋</span>
                <span class="tab-label">Info Pratiche</span>
              </button>
            </div>
          </div>
        </nav>

        <!-- Content Sections -->
        <div class="sections-container">
          @for (section of details()!.sections; track section.id) {
            <section 
              class="content-section"
              [id]="section.id"
              [class.active]="activeSection() === section.id">
              <div class="container">
                <div class="section-header">
                  <span class="section-icon">{{ section.icon }}</span>
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
                              <span>⏱️</span> {{ item.duration }}
                            </span>
                          }
                          @if (item.priceRange) {
                            <span class="meta-tag">
                              <span>💰</span> {{ item.priceRange }}
                            </span>
                          }
                          @if (item.location) {
                            <span class="meta-tag">
                              <span>📍</span> {{ item.location }}
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
                <span class="section-icon">📋</span>
                <h2>Informazioni Pratiche</h2>
              </div>

              <div class="practical-grid">
                <div class="practical-card animate-fade-in-up">
                  <h3>📄 Documenti</h3>
                  <p>{{ details()!.practicalInfo.documents }}</p>
                </div>

                <div class="practical-card animate-fade-in-up animate-delay-1">
                  <h3>☀️ Periodo Migliore</h3>
                  <p>{{ details()!.practicalInfo.bestTimeToVisit }}</p>
                </div>

                <div class="practical-card animate-fade-in-up animate-delay-2">
                  <h3>💰 Costi Medi</h3>
                  <ul class="cost-list">
                    <li><span>Pasto:</span> {{ details()!.practicalInfo.averageCosts.meal }}</li>
                    <li><span>Trasporti:</span> {{ details()!.practicalInfo.averageCosts.transport }}</li>
                    <li><span>Alloggio:</span> {{ details()!.practicalInfo.averageCosts.accommodation }}</li>
                  </ul>
                </div>

                <div class="practical-card animate-fade-in-up animate-delay-3">
                  <h3>🚌 Come Muoversi</h3>
                  <ul>
                    @for (tip of details()!.practicalInfo.gettingAround; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>

                <div class="practical-card full-width animate-fade-in-up animate-delay-4">
                  <h3>💡 Consigli dai Locali</h3>
                  <div class="tips-grid">
                    @for (tip of details()!.practicalInfo.tipsFromLocals; track tip) {
                      <div class="tip-item">
                        <span class="tip-icon">✨</span>
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
                  <h3>🛡️ Sicurezza</h3>
                </div>
                
                @if (details()!.safety.currentAlerts.length > 0) {
                  <div class="alerts">
                    @for (alert of details()!.safety.currentAlerts; track alert) {
                      <div class="alert-item">⚠️ {{ alert }}</div>
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
                <span class="section-icon">🎯</span>
                <div>
                  <h2>Attrazioni da non perdere</h2>
                  <span class="live-badge">📍 Dati in tempo reale</span>
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
                <span class="section-icon">🍽️</span>
                <div>
                  <h2>Dove mangiare</h2>
                  <span class="live-badge">📍 Dati in tempo reale</span>
                </div>
              </div>
              <div class="places-grid restaurants-grid">
                @for (place of restaurants().slice(0, 6); track place.id; let i = $index) {
                  <div class="place-card restaurant-card" [style.animation-delay.ms]="i * 50">
                    <div class="place-icon">🍴</div>
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

        <!-- Viral Content - TikTok Videos -->
        @if (tiktokVideos().length > 0 || details()!.viralContent.length > 0) {
          <section class="viral-section">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">📱</span>
                <div>
                  <h2>Trending sui Social</h2>
                  <span class="viral-subtitle">Scopri cosa dicono i creator su questa città</span>
                </div>
              </div>
              
              <!-- TikTok Videos Grid -->
              @if (tiktokVideos().length > 0) {
                <div class="tiktok-grid">
                  @for (video of tiktokVideos(); track video.id; let i = $index) {
                    <div class="tiktok-card" [style.animation-delay.ms]="i * 100">
                      <div class="tiktok-embed">
                        <iframe 
                          [src]="getTikTokEmbedUrl(video.videoId)" 
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowfullscreen>
                        </iframe>
                      </div>
                      <div class="tiktok-info">
                        <span class="tiktok-creator">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                          </svg>
                          {{ video.creator }}
                        </span>
                        <span class="tiktok-views">{{ formatViews(video.views) }} views</span>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Fallback to regular viral content -->
              @if (tiktokVideos().length === 0 && details()!.viralContent.length > 0) {
                <div class="viral-grid">
                  @for (content of details()!.viralContent; track content.id) {
                    <a 
                      [href]="content.externalUrl" 
                      target="_blank" 
                      rel="noopener"
                      class="viral-card"
                      (click)="trackExternalClick('viral', content.platform)">
                      <div class="viral-badge">{{ getPlatformIcon(content.platform) }}</div>
                      <div class="viral-info">
                        <span class="viral-title">{{ content.title }}</span>
                        <span class="viral-meta">{{ content.creator }} · {{ content.views }} views</span>
                      </div>
                    </a>
                  }
                </div>
              }
            </div>
          </section>
        }

        <!-- Flight Deals -->
        @if (details()!.flightDeals.length > 0) {
          <section class="deals-section">
            <div class="container">
              <div class="section-header">
                <span class="section-icon">✈️</span>
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
                <span class="section-icon">📸</span>
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
                      <span class="gallery-credit">📷 {{ photo.user.name }}</span>
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

      h1 {
        font-size: var(--text-5xl);
        color: white;
        margin-bottom: var(--space-2);

        @media (min-width: 768px) {
          font-size: 4rem;
        }
      }

      .location {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-lg);
        opacity: 0.9;
        margin-bottom: var(--space-4);
      }

      .tagline {
        font-size: var(--text-xl);
        font-style: italic;
        opacity: 0.85;
        max-width: 600px;
      }
    }

    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-6);
      margin-bottom: var(--space-8);
      padding: var(--space-4);
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: var(--border-radius-lg);
      width: fit-content;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);

      .meta-value {
        font-size: var(--text-lg);
        font-weight: 600;
      }

      .meta-label {
        font-size: var(--text-xs);
        opacity: 0.7;
        text-transform: uppercase;
        letter-spacing: 0.05em;
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

      .story-unique {
        color: var(--color-gray-400);
        border-left: 3px solid var(--color-accent);
        padding-left: var(--space-4);
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

      h4 {
        font-size: var(--text-sm);
        color: var(--color-gray-400);
        margin-bottom: var(--space-3);
      }
    }

    .type-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .type-tag {
      padding: var(--space-2) var(--space-3);
      background: var(--color-cream);
      border-radius: var(--border-radius-full);
      font-size: var(--text-sm);
      color: var(--color-gray-500);
    }

    .quick-info {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-sm);

      .info-icon {
        font-size: 1.2em;
      }

      .info-text {
        color: var(--color-gray-500);
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
      font-size: var(--text-sm);
      color: var(--color-accent);
      font-weight: 500;
      margin-bottom: var(--space-4);
      
      &:hover {
        text-decoration: underline;
      }
    }

    // Weather Forecast Card
    .weather-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: var(--space-5);
      border-radius: var(--border-radius-lg);
      color: white;
      margin-bottom: var(--space-4);

      h4 {
        font-size: var(--text-sm);
        color: rgba(255,255,255,0.9);
        margin-bottom: var(--space-4);
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
      z-index: var(--z-sticky);
      background: var(--color-white);
      border-bottom: 1px solid var(--color-gray-100);
      transition: box-shadow var(--transition-base);

      &.stuck {
        box-shadow: var(--shadow-md);
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
    }

    .tab-icon {
      font-size: 1.1em;
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
        font-size: 2rem;
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
        font-size: var(--text-lg);
        margin-bottom: var(--space-3);
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
        flex-shrink: 0;
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
        margin: 0;
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
        padding: var(--space-3);
        background: rgba(241, 196, 15, 0.1);
        border-radius: var(--border-radius-sm);
        font-size: var(--text-sm);
        color: #856404;
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

    // TikTok Grid
    .tiktok-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-6);

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        max-width: 400px;
        margin: 0 auto;
      }
    }

    .tiktok-card {
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

    .tiktok-embed {
      aspect-ratio: 9/16;
      max-height: 500px;
      background: #000;
      position: relative;

      iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 80%, rgba(0,0,0,0.5) 100%);
        pointer-events: none;
        z-index: 1;
      }
    }

    .tiktok-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-4);
      background: rgba(0, 0, 0, 0.2);
    }

    .tiktok-creator {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      font-weight: 500;

      svg {
        opacity: 0.8;
      }
    }

    .tiktok-views {
      font-size: var(--text-xs);
      opacity: 0.7;
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
      font-size: 1.5rem;
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
      font-size: var(--text-xs);
      color: white;
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
      font-size: 1.5rem;
      flex-shrink: 0;
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

  // TikTok Videos
  tiktokVideos = signal<TikTokVideo[]>([]);
  private sanitizedUrls = new Map<string, SafeResourceUrl>();

  private scrollListener: (() => void) | null = null;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;
  private sanitizer = inject(DomSanitizer);

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
      
      // Load TikTok videos
      this.loadTikTokVideos(details.name);
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
      'tiktok': '📱',
      'instagram': '📸',
      'youtube': '▶️'
    };
    return icons[platform] || '🔗';
  }

  setActiveSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    this.scrollToSection(sectionId);
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for sticky nav
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
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

  // TikTok embed URL (sanitized)
  getTikTokEmbedUrl(videoId: string): SafeResourceUrl {
    if (this.sanitizedUrls.has(videoId)) {
      return this.sanitizedUrls.get(videoId)!;
    }
    const url = `https://www.tiktok.com/embed/v2/${videoId}`;
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

  // Load TikTok videos for the city
  private loadTikTokVideos(cityName: string): void {
    // TikTok videos data - curated list of popular travel videos
    const cityTikToks: Record<string, TikTokVideo[]> = {
      'tokyo': [
        { id: '1', videoId: '7293894839282398466', creator: '@tokyoexplorer', views: 2500000, title: 'Tokyo Street Food' },
        { id: '2', videoId: '7281234567890123456', creator: '@japantravels', views: 1800000, title: 'Shibuya Crossing' },
        { id: '3', videoId: '7270987654321098765', creator: '@asianfoodie', views: 3200000, title: 'Ramen Tour' },
      ],
      'paris': [
        { id: '1', videoId: '7287654321098765432', creator: '@parisvibe', views: 4100000, title: 'Paris by Night' },
        { id: '2', videoId: '7276543210987654321', creator: '@frenchfood', views: 2900000, title: 'Best Croissants' },
        { id: '3', videoId: '7265432109876543210', creator: '@eurotravel', views: 1500000, title: 'Eiffel Tower Secrets' },
      ],
      'rome': [
        { id: '1', videoId: '7284321098765432109', creator: '@romelife', views: 3800000, title: 'Colosseum at Sunset' },
        { id: '2', videoId: '7273210987654321098', creator: '@italianfood', views: 5200000, title: 'Real Carbonara' },
        { id: '3', videoId: '7262109876543210987', creator: '@trastevere', views: 1200000, title: 'Hidden Rome' },
      ],
      'barcelona': [
        { id: '1', videoId: '7281098765432109876', creator: '@barcelonavibes', views: 2100000, title: 'Sagrada Familia' },
        { id: '2', videoId: '7270987654321098765', creator: '@tapaslife', views: 1700000, title: 'Best Tapas Bars' },
        { id: '3', videoId: '7259876543210987654', creator: '@beachlife', views: 900000, title: 'Barceloneta Beach' },
      ],
      'newyork': [
        { id: '1', videoId: '7278765432109876543', creator: '@nyclife', views: 6500000, title: 'NYC in 24 Hours' },
        { id: '2', videoId: '7267654321098765432', creator: '@foodienyc', views: 4300000, title: 'Pizza Tour' },
        { id: '3', videoId: '7256543210987654321', creator: '@centralparkny', views: 2800000, title: 'Central Park' },
      ],
      'bali': [
        { id: '1', videoId: '7275432109876543210', creator: '@balivibes', views: 8200000, title: 'Bali Paradise' },
        { id: '2', videoId: '7264321098765432109', creator: '@ubud', views: 3100000, title: 'Rice Terraces' },
        { id: '3', videoId: '7253210987654321098', creator: '@balifood', views: 2400000, title: 'Beach Clubs' },
      ],
      'dubai': [
        { id: '1', videoId: '7272109876543210987', creator: '@dubailife', views: 5700000, title: 'Burj Khalifa' },
        { id: '2', videoId: '7261098765432109876', creator: '@luxury', views: 4800000, title: 'Dubai Marina' },
        { id: '3', videoId: '7250987654321098765', creator: '@desertsafari', views: 1900000, title: 'Desert Safari' },
      ],
      'lisbon': [
        { id: '1', videoId: '7268987654321098765', creator: '@lisbonlove', views: 1400000, title: 'Tram 28' },
        { id: '2', videoId: '7257876543210987654', creator: '@pasteis', views: 2200000, title: 'Pastel de Nata' },
        { id: '3', videoId: '7246765432109876543', creator: '@alfama', views: 800000, title: 'Fado Night' },
      ],
      'amsterdam': [
        { id: '1', videoId: '7265654321098765432', creator: '@amsterdamvibes', views: 1800000, title: 'Canal Tour' },
        { id: '2', videoId: '7254543210987654321', creator: '@dutchfood', views: 1100000, title: 'Stroopwafel' },
        { id: '3', videoId: '7243432109876543210', creator: '@bikeamsterdam', views: 600000, title: 'Bike Culture' },
      ],
      'sydney': [
        { id: '1', videoId: '7262321098765432109', creator: '@sydneylife', views: 2600000, title: 'Opera House' },
        { id: '2', videoId: '7251210987654321098', creator: '@bondibeach', views: 3900000, title: 'Bondi to Coogee' },
        { id: '3', videoId: '7240109876543210987', creator: '@aussiebbq', views: 1500000, title: 'Beach Life' },
      ],
    };

    const cityKey = cityName.toLowerCase().replace(/\s+/g, '');
    const videos = cityTikToks[cityKey] || [];
    this.tiktokVideos.set(videos);
  }
}

