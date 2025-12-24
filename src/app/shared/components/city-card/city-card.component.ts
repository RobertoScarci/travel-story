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
          
          <!-- Tags -->
          <div class="card-tags">
            @for (tag of city.tags.slice(0, 2); track tag) {
              <span class="tag">{{ tagLabels[tag] || tag }}</span>
            }
          </div>

          <!-- Save Button (only for registered users) -->
          @if (userService.isAuthenticated()) {
            <button 
              class="save-btn" 
              [class.saved]="isSaved"
              (click)="onSaveClick($event)"
              [attr.aria-label]="isSaved ? 'Rimuovi dai salvati' : 'Salva'">
              <svg width="20" height="20" viewBox="0 0 24 24" [attr.fill]="isSaved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          }

          <!-- Price Level -->
          <div class="price-level">
            {{ getPriceIndicator() }}
          </div>
        </div>

        <!-- Content -->
        <div class="card-content">
          <div class="card-header">
            <h3 class="city-name">{{ city.name }}</h3>
            <span class="country">{{ city.country }}</span>
          </div>

          <p class="tagline">{{ city.tagline }}</p>

          <div class="card-meta">
            <div class="rating">
              <span class="star">★</span>
              <span>{{ city.rating }}</span>
            </div>
            <div class="duration">
              {{ city.suggestedDays.min }}-{{ city.suggestedDays.max }} giorni
            </div>
          </div>
        </div>
      </a>

      <!-- Recommendation Badge (if provided) -->
      @if (recommendation) {
        <div class="recommendation-badge">
          <span class="badge-icon">✨</span>
          <span class="badge-text">{{ recommendation }}</span>
        </div>
      }
    </article>
  `,
  styles: [`
    .city-card {
      position: relative;
      background: var(--color-white);
      border-radius: var(--border-radius-lg);
      overflow: hidden;
      transition: all var(--transition-base);

      &:hover {
        transform: translateY(-8px);
        box-shadow: var(--shadow-xl);

        .card-image img {
          transform: scale(1.05);
        }

        .image-overlay {
          opacity: 0.3;
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
      aspect-ratio: 4/3;
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
        transparent 40%,
        rgba(0, 0, 0, 0.6) 100%
      );
      opacity: 0.5;
      transition: opacity var(--transition-base);
    }

    // Tags
    .card-tags {
      position: absolute;
      top: var(--space-3);
      left: var(--space-3);
      display: flex;
      gap: var(--space-2);
    }

    .tag {
      padding: var(--space-1) var(--space-3);
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(4px);
      border-radius: var(--border-radius-full);
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--color-gray-500);
    }

    // Save Button
    .save-btn {
      position: absolute;
      top: var(--space-3);
      right: var(--space-3);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(4px);
      border: none;
      border-radius: 50%;
      color: var(--color-gray-400);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        transform: scale(1.1);
        color: var(--color-accent);
      }

      &.saved {
        color: var(--color-accent);
        background: rgba(233, 69, 96, 0.1);
      }
    }

    // Price Level
    .price-level {
      position: absolute;
      bottom: var(--space-3);
      right: var(--space-3);
      padding: var(--space-1) var(--space-2);
      background: rgba(255, 255, 255, 0.95);
      border-radius: var(--border-radius-sm);
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--color-primary);
    }

    // Content Section
    .card-content {
      padding: var(--space-4);
    }

    .card-header {
      display: flex;
      align-items: baseline;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }

    .city-name {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-primary);
      margin: 0;
    }

    .country {
      font-size: var(--text-sm);
      color: var(--color-gray-400);
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
      justify-content: space-between;
      font-size: var(--text-sm);
      color: var(--color-gray-400);
    }

    .rating {
      display: flex;
      align-items: center;
      gap: var(--space-1);

      .star {
        color: var(--color-highlight);
      }
    }

    // Recommendation Badge
    .recommendation-badge {
      position: absolute;
      top: 0;
      left: var(--space-4);
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-3);
      background: linear-gradient(135deg, var(--color-accent), var(--color-highlight));
      color: white;
      font-size: var(--text-xs);
      font-weight: 500;
      border-radius: 0 0 var(--border-radius-sm) var(--border-radius-sm);
      transform: translateY(-100%);
      animation: slideDown 0.3s ease forwards;
    }

    @keyframes slideDown {
      to {
        transform: translateY(0);
      }
    }

    .badge-icon {
      font-size: 1.1em;
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
    technology: 'Tech'
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

