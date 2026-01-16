import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { City } from '../models/city.model';

/**
 * SEO Service - Handles dynamic meta tags and SEO optimization
 * 
 * Features:
 * - Dynamic page titles
 * - Open Graph meta tags for social sharing
 * - Twitter Card meta tags
 * - Structured data (JSON-LD)
 * - Meta descriptions optimized for search engines
 */
@Injectable({
  providedIn: 'root'
})
export class SEOService {
  private title = inject(Title);
  private meta = inject(Meta);

  private readonly DEFAULT_TITLE = 'TravelStory - Scopri il mondo, una storia alla volta';
  private readonly DEFAULT_DESCRIPTION = 'Scopri destinazioni incredibili, pianifica il tuo viaggio perfetto e vivi esperienze uniche con TravelStory. Guide dettagliate, consigli pratici e storie di viaggio.';
  private readonly DEFAULT_IMAGE = '/assets/og-default.jpg';
  private readonly BASE_URL = 'https://travelstory.app'; // Update with your actual domain

  /**
   * Set default meta tags
   */
  setDefaultTags(): void {
    this.title.setTitle(this.DEFAULT_TITLE);
    this.updateMetaTags({
      title: this.DEFAULT_TITLE,
      description: this.DEFAULT_DESCRIPTION,
      image: this.DEFAULT_IMAGE
    });
  }

  /**
   * Update meta tags for city page
   */
  updateCityPage(city: City): void {
    const title = `${city.name}, ${city.country} - TravelStory`;
    const description = city.tagline || `Scopri ${city.name}, ${city.country}. ${city.name} è ${city.continent.toLowerCase()}. Valutazione: ${city.rating.toFixed(1)}/5. Scopri cosa vedere, dove dormire e cosa fare.`;
    const image = city.heroImage || city.thumbnailImage || this.DEFAULT_IMAGE;
    const url = `${this.BASE_URL}/city/${city.id}`;

    this.title.setTitle(title);
    this.updateMetaTags({
      title,
      description,
      image,
      url,
      type: 'article',
      siteName: 'TravelStory',
      locale: 'it_IT'
    });

    // Add structured data (JSON-LD)
    this.addStructuredData(city);
  }

  /**
   * Update meta tags for destinations page
   */
  updateDestinationsPage(filterCount?: number): void {
    const title = filterCount 
      ? `Destinazioni (${filterCount}) - TravelStory`
      : 'Tutte le Destinazioni - TravelStory';
    const description = 'Esplora tutte le destinazioni disponibili su TravelStory. Filtra per continente, stile di viaggio, budget e trova la meta perfetta per te.';
    
    this.title.setTitle(title);
    this.updateMetaTags({
      title,
      description,
      image: this.DEFAULT_IMAGE,
      url: `${this.BASE_URL}/destinations`
    });
  }

  /**
   * Update meta tags for home page
   */
  updateHomePage(): void {
    this.title.setTitle(this.DEFAULT_TITLE);
    this.updateMetaTags({
      title: this.DEFAULT_TITLE,
      description: this.DEFAULT_DESCRIPTION,
      image: this.DEFAULT_IMAGE,
      url: this.BASE_URL
    });
  }

  /**
   * Core method to update all meta tags
   */
  private updateMetaTags(options: {
    title: string;
    description: string;
    image: string;
    url?: string;
    type?: string;
    siteName?: string;
    locale?: string;
  }): void {
    const url = options.url || this.BASE_URL;
    const type = options.type || 'website';

    // Basic meta tags
    this.meta.updateTag({ name: 'description', content: options.description });
    this.meta.updateTag({ name: 'keywords', content: `viaggi, ${options.title}, destinazioni, turismo, guide viaggio` });

    // Open Graph tags (Facebook, LinkedIn, etc.)
    this.meta.updateTag({ property: 'og:title', content: options.title });
    this.meta.updateTag({ property: 'og:description', content: options.description });
    this.meta.updateTag({ property: 'og:image', content: options.image });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: type });
    if (options.siteName) {
      this.meta.updateTag({ property: 'og:site_name', content: options.siteName });
    }
    if (options.locale) {
      this.meta.updateTag({ property: 'og:locale', content: options.locale });
    }

    // Twitter Card tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: options.title });
    this.meta.updateTag({ name: 'twitter:description', content: options.description });
    this.meta.updateTag({ name: 'twitter:image', content: options.image });

    // Additional meta tags
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({ name: 'author', content: 'TravelStory' });
  }

  /**
   * Add structured data (JSON-LD) for better SEO
   */
  private addStructuredData(city: City): void {
    // Remove existing structured data script if any
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'TouristDestination',
      name: city.name,
      description: city.tagline,
      image: city.heroImage || city.thumbnailImage,
      address: {
        '@type': 'PostalAddress',
        addressCountry: city.country,
        addressRegion: city.continent
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: city.rating.toString(),
        bestRating: '5',
        worstRating: '1',
        ratingCount: '1'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: city.coordinates?.lat?.toString(),
        longitude: city.coordinates?.lng?.toString()
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }

  /**
   * Remove structured data
   */
  removeStructuredData(): void {
    const script = document.querySelector('script[type="application/ld+json"]');
    if (script) {
      script.remove();
    }
  }
}
