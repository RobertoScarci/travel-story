import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * OptimizedImageComponent - Optimized image loading with placeholder blur
 * 
 * Features:
 * - Placeholder blur effect during loading
 * - Responsive images with srcset
 * - Lazy loading by default
 * - Smooth fade-in transition when loaded
 * - Error handling with fallback
 */
@Component({
  selector: 'app-optimized-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="optimized-image-wrapper" [class.loaded]="imageLoaded()" [class.error]="imageError()">
      <!-- Placeholder blur -->
      @if (!imageLoaded() && !imageError()) {
        <div class="image-placeholder">
          <img 
            [src]="placeholderDataUrl()" 
            [alt]="alt"
            class="placeholder-blur">
        </div>
      }
      
      <!-- Main image -->
      <img 
        [src]="src()"
        [srcset]="srcset()"
        [sizes]="sizes()"
        [alt]="alt"
        [loading]="loading"
        [class]="imageClass"
        (load)="onImageLoad()"
        (error)="onImageError()"
        [class.loaded]="imageLoaded()"
        [class.error]="imageError()">
      
      <!-- Error fallback -->
      @if (imageError()) {
        <div class="error-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
            <circle cx="7" cy="7" r="1"/>
            <line x1="16" y1="13" x2="12" y2="9"/>
            <line x1="12" y1="9" x2="8" y2="13"/>
          </svg>
        </div>
      }
    </div>
  `,
  styles: [`
    .optimized-image-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: linear-gradient(135deg, var(--color-gray-100) 0%, var(--color-gray-200) 100%);
    }

    .image-placeholder {
      position: absolute;
      inset: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color-gray-100) 0%, var(--color-gray-200) 100%);
      
      .placeholder-blur {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: blur(20px);
        transform: scale(1.1);
        opacity: 0.6;
      }
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.3s ease;
      opacity: 0;
      
      &.loaded {
        opacity: 1;
        z-index: 2;
      }
      
      &.error {
        opacity: 0;
      }
    }

    .error-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color-gray-100) 0%, var(--color-gray-200) 100%);
      color: var(--color-gray-400);
      z-index: 2;
    }

    .optimized-image-wrapper.loaded {
      .image-placeholder {
        opacity: 0;
        transition: opacity 0.3s ease;
      }
    }
  `]
})
export class OptimizedImageComponent implements OnInit {
  @Input() src = '';
  @Input() alt = '';
  @Input() loading: 'lazy' | 'eager' = 'lazy';
  @Input() imageClass = '';
  @Input() aspectRatio?: string;
  @Input() width?: number;
  @Input() height?: number;
  
  // Responsive image support
  @Input() srcset?: string;
  @Input() sizes?: string;

  imageLoaded = signal(false);
  imageError = signal(false);
  
  // Generate a simple placeholder blur data URL
  placeholderDataUrl = computed(() => {
    // Create a tiny 20x20px blurred placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a simple gradient placeholder
      const gradient = ctx.createLinearGradient(0, 0, 20, 20);
      gradient.addColorStop(0, '#f3f4f6');
      gradient.addColorStop(1, '#e5e7eb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 20, 20);
    }
    
    return canvas.toDataURL();
  });

  ngOnInit(): void {
    // Preload if eager
    if (this.loading === 'eager' && this.src) {
      const img = new Image();
      img.onload = () => this.imageLoaded.set(true);
      img.onerror = () => this.imageError.set(true);
      img.src = this.src;
    }
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
    this.imageError.set(false);
  }

  onImageError(): void {
    this.imageError.set(true);
    this.imageLoaded.set(false);
  }
}
