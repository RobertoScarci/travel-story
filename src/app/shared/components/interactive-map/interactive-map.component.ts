import { Component, Input, OnInit, OnDestroy, AfterViewInit, signal, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { City } from '../../../core/models/city.model';

export interface MapMarker {
  city: City;
  marker: L.Marker;
}

/**
 * InteractiveMapComponent - Interactive map for displaying destinations
 * 
 * Features:
 * - Display cities as markers on map
 * - Click markers to navigate to city page
 * - Filter markers based on active filters
 * - Responsive design
 * - Custom markers with city info
 */
@Component({
  selector: 'app-interactive-map',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="map-container">
      <div #mapContainer class="map-wrapper"></div>
      @if (loading()) {
        <div class="map-loading">
          <div class="loader"></div>
          <p>Caricamento mappa...</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .map-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 500px;
      border-radius: var(--border-radius-lg);
      overflow: hidden;
      background: var(--color-gray-100);
    }

    .map-wrapper {
      width: 100%;
      height: 100%;
      min-height: 500px;
    }

    .map-loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.9);
      z-index: 1000;
      gap: var(--space-3);
    }

    .loader {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-gray-200);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Override Leaflet default styles */
    :host ::ng-deep .leaflet-container {
      font-family: var(--font-body);
    }

    :host ::ng-deep .leaflet-popup-content-wrapper {
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-lg);
    }

    :host ::ng-deep .leaflet-popup-content {
      margin: var(--space-3);
      font-size: var(--text-sm);
    }

    :host ::ng-deep .leaflet-popup-content a {
      color: var(--color-accent);
      text-decoration: none;
      font-weight: 600;
      
      &:hover {
        text-decoration: underline;
      }
    }
  `]
})
export class InteractiveMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() cities: City[] = [];
  @Input() filteredCities: City[] = [];
  @Input() initialCenter: [number, number] = [20, 0]; // Default: center of world
  @Input() initialZoom = 2;
  @Input() minZoom = 2;
  @Input() maxZoom = 10;

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  loading = signal(true);
  map: L.Map | null = null;
  markers: Map<string, MapMarker> = new Map();
  markerGroup: L.LayerGroup | null = null;

  private defaultIcon = L.icon({
    iconUrl: 'assets/marker-icon.png',
    iconRetinaUrl: 'assets/marker-icon-2x.png',
    shadowUrl: 'assets/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
  });

  ngOnInit(): void {
    // Create default icon if custom assets don't exist
    this.createDefaultIcon();
  }

  ngAfterViewInit(): void {
    if (this.mapContainer) {
      this.initMap();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private createDefaultIcon(): void {
    // Create a simple SVG icon as fallback
    const svgIcon = `
      <svg width="25" height="41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.3 12.5 28.5 12.5 28.5S25 20.8 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#e94560"/>
        <circle cx="12.5" cy="12.5" r="5" fill="white"/>
      </svg>
    `;
    
    // Convert SVG to data URL
    const svgBlob = new Blob([svgIcon], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    this.defaultIcon = L.icon({
      iconUrl: url,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28]
    });
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) {
      console.error('Map container not found');
      return;
    }

    try {
      // Initialize map
      this.map = L.map(this.mapContainer.nativeElement, {
        center: this.initialCenter,
        zoom: this.initialZoom,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        zoomControl: true,
        attributionControl: true
      });

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        tileSize: 256,
        zoomOffset: 0
      }).addTo(this.map);

      // Create marker group
      this.markerGroup = L.layerGroup().addTo(this.map);

      // Wait for map to be ready
      this.map.whenReady(() => {
        this.loading.set(false);
        this.updateMarkers();
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      this.loading.set(false);
    }
  }

  private updateMarkers(): void {
    if (!this.map || !this.markerGroup) return;

    // Clear existing markers
    this.markerGroup.clear();
    this.markers.clear();

    // Add markers for filtered cities
    const citiesToShow = this.filteredCities.length > 0 ? this.filteredCities : this.cities;
    
    citiesToShow.forEach(city => {
      if (city.coordinates && city.coordinates.lat && city.coordinates.lng) {
        this.addMarker(city);
      }
    });

    // Fit bounds to show all markers if there are any
    if (this.markers.size > 0) {
      const bounds = L.latLngBounds(
        Array.from(this.markers.values()).map(m => m.marker.getLatLng())
      );
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }

  private addMarker(city: City): void {
    if (!this.map || !this.markerGroup) return;

    const lat = city.coordinates.lat;
    const lng = city.coordinates.lng;

    // Create marker
    const marker = L.marker([lat, lng], {
      icon: this.defaultIcon
    });

    // Create popup content
    const popupContent = `
      <div class="map-popup">
        <h4>${city.name}</h4>
        <p class="popup-location">${city.country}</p>
        <p class="popup-tagline">${city.tagline || ''}</p>
        <div class="popup-meta">
          <span>★ ${city.rating.toFixed(1)}</span>
          <span>•</span>
          <span>${city.suggestedDays.min}-${city.suggestedDays.max} giorni</span>
        </div>
        <a href="/city/${city.id}" class="popup-link">Vedi dettagli →</a>
      </div>
    `;

    marker.bindPopup(popupContent, {
      className: 'custom-popup',
      maxWidth: 250
    });

    // Add click handler to navigate
    marker.on('click', () => {
      // Navigation will be handled by the popup link
    });

    // Add to map
    marker.addTo(this.markerGroup!);
    
    // Store marker
    this.markers.set(city.id, { city, marker });
  }

  // Public method to update cities
  updateCities(cities: City[]): void {
    this.cities = cities;
    this.updateMarkers();
  }

  // Public method to update filtered cities
  updateFilteredCities(cities: City[]): void {
    this.filteredCities = cities;
    this.updateMarkers();
  }
}
