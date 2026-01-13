import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { City } from '../../../core/models/city.model';
import { UserService } from '../../../core/services/user.service';

/**
 * CityCardComponent - Reusable city preview card
 * 
 * Design philosophy:
 * - Visual impact first (large, beautiful images)
 * - Essential info at a glance
 * - Subtle interactions that delight
 */
@Component({
  selector: 'app-city-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <article class="city-card" [class.featured]="featured">
      <a [routerLink]="['/city', city.id]" class="card-link">
        <!-- Image -->
        <div class="card-image">
          <img [src]="city.thumbnailImage" [alt]="city.name" loading="lazy">
          <div class="image-overlay"></div>
          
          <!-- Top bar: Tags on left, Save on right (only if no recommendation) -->
          <div class="card-top-bar">
            <div class="card-tags">
              @for (tag of city.tags.slice(0, 2); track tag) {
                <span class="tag">{{ tagLabels[tag] || tag }}</span>
              }
            </div>
            
            <!-- Save Button (only for registered users and when no recommendation badge) -->
            @if (userService.isAuthenticated() && !recommendation) {
              <button 
                class="save-btn" 
                [class.saved]="isSaved"
                (click)="onSaveClick($event)"
                [attr.aria-label]="isSaved ? 'Rimuovi dai salvati' : 'Salva'">
                <svg width="18" height="18" viewBox="0 0 24 24" [attr.fill]="isSaved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            }
          </div>

          <!-- Bottom bar: Location + Price -->
          <div class="card-bottom-bar">
            <span class="location-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {{ city.country }}
            </span>
            <span class="price-level">{{ getPriceIndicator() }}</span>
          </div>
        </div>

        <!-- Content -->
        <div class="card-content">
          <h3 class="city-name">{{ city.name }}</h3>
          <p class="tagline">{{ city.tagline }}</p>

          <div class="card-meta">
            <div class="rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-highlight)" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{{ city.rating.toFixed(1) }}</span>
            </div>
            <span class="meta-separator">•</span>
            <div class="duration">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ city.suggestedDays.min }}-{{ city.suggestedDays.max }} giorni
            </div>
            <span class="meta-separator">•</span>
            <div class="best-period">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
              {{ city.bestPeriod[0] }}
            </div>
          </div>
        </div>
      </a>

      <!-- Recommendation Badge (if provided) -->
      @if (recommendation) {
        <div class="recommendation-badge">
          <svg class="badge-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span class="badge-text">{{ recommendation }}</span>
        </div>
      }
    </article>
  `,
  styles: [`
    .city-card {
      position: relative;
      background: var(--color-white);
      border-radius: var(--border-radius-xl);
      overflow: hidden;
      transition: all var(--transition-base);
      box-shadow: var(--shadow-sm);

      &:hover {
        transform: translateY(-6px);
        box-shadow: var(--shadow-xl);

        .card-image img {
          transform: scale(1.08);
        }

        .image-overlay {
          opacity: 0.4;
        }
      }

      &.featured {
        .card-image {
          aspect-ratio: 16/10;
        }

        .city-name {
          font-size: var(--text-2xl);
        }
      }
    }

    .card-link {
      display: block;
      color: inherit;
      text-decoration: none;
    }

    // Image Section
    .card-image {
      position: relative;
      aspect-ratio: 3/2;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform var(--transition-slow);
      }
    }

    .image-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.1) 0%,
        transparent 30%,
        transparent 60%,
        rgba(0, 0, 0, 0.5) 100%
      );
      transition: opacity var(--transition-base);
    }

    // Top bar - contains tags and save button
    .card-top-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: var(--space-3);
      z-index: 2;
    }

    // Tags
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      max-width: calc(100% - 44px);
    }

    .tag {
      padding: 5px 12px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: var(--border-radius-full);
      font-size: 10px;
      font-weight: 600;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    // Save Button
    .save-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border: none;
      border-radius: 50%;
      color: var(--color-gray-400);
      cursor: pointer;
      transition: all var(--transition-fast);
      flex-shrink: 0;

      &:hover {
        transform: scale(1.1);
        color: var(--color-accent);
      }

      &.saved {
        color: var(--color-accent);
        background: rgba(233, 69, 96, 0.15);
      }
    }

    // Bottom bar - contains location and price
    .card-bottom-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3);
      z-index: 2;
    }

    .location-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: var(--border-radius-full);
      font-size: 11px;
      font-weight: 500;
      color: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

      svg {
        opacity: 0.9;
        stroke: white;
      }
    }

    .price-level {
      padding: 5px 12px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: var(--border-radius-full);
      font-size: 12px;
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: 1px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    // Content Section
    .card-content {
      padding: var(--space-4);
    }

    .city-name {
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 700;
      color: var(--color-primary);
      margin: 0 0 var(--space-1) 0;
      line-height: 1.2;
    }

    .tagline {
      font-size: var(--text-sm);
      color: var(--color-gray-500);
      margin: 0 0 var(--space-3);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--color-gray-500);
    }

    .meta-separator {
      color: var(--color-gray-300);
    }

    .rating, .duration, .best-period {
      display: flex;
      align-items: center;
      gap: 4px;

      svg {
        flex-shrink: 0;
      }
    }

    .rating {
      font-weight: 600;
      color: var(--color-gray-600);
    }

    // Recommendation Badge - compact version
    .recommendation-badge {
      position: absolute;
      top: var(--space-2);
      right: var(--space-2);
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 4px 8px;
      background: linear-gradient(135deg, var(--color-accent), #ff6b6b);
      color: white;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      border-radius: var(--border-radius-full);
      box-shadow: 0 2px 8px rgba(233, 69, 96, 0.35);
      z-index: 10;
      max-width: 45%;
      text-align: center;
      line-height: 1.1;
    }

    .badge-icon {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      
      svg {
        width: 10px;
        height: 10px;
      }
    }
  `]
})
export class CityCardComponent {
  @Input({ required: true }) city!: City;
  @Input() featured = false;
  @Input() recommendation?: string;
  @Output() saved = new EventEmitter<string>();

  tagLabels: Record<string, string> = {
    cultural: 'Cultura',
    foodie: 'Gastronomia',
    adventure: 'Avventura',
    relaxation: 'Relax',
    nightlife: 'Vita notturna',
    nature: 'Natura',
    romantic: 'Romantico',
    budget: 'Low-cost',
    luxury: 'Lusso',
    beach: 'Mare',
    architecture: 'Architettura',
    spiritual: 'Spirituale',
    unique: 'Unico',
    photography: 'Fotografico',
    wine: 'Vino',
    wildlife: 'Wildlife',
    exotic: 'Esotico',
    technology: 'Tech',
    historic: 'Storico',
    family: 'Famiglia',
    shopping: 'Shopping',
    music: 'Musica',
    art: 'Arte',
    trekking: 'Trekking',
    diving: 'Diving',
    skiing: 'Sci',
    extreme: 'Estremo',
    entertainment: 'Intrattenimento',
    sports: 'Sport',
    cycling: 'Ciclismo'
  };

  constructor(public userService: UserService) {}

  get isSaved(): boolean {
    return this.userService.isCitySaved(this.city.id);
  }

  getPriceIndicator(): string {
    return '€'.repeat(this.city.priceLevel);
  }

  onSaveClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.isSaved) {
      this.userService.unsaveCity(this.city.id);
    } else {
      this.userService.saveCity(this.city.id);
    }
    
    this.saved.emit(this.city.id);
  }
}


