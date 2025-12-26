import { ApplicationConfig } from '@angular/core';
import { provideRouter, withViewTransitions, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

/**
 * Application Configuration
 * 
 * Features:
 * - View transitions for smooth page changes
 * - Lazy loading through route configuration
 * - HTTP client for API calls
 * - Scroll to top on navigation
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions(), // Enable smooth page transitions
      withInMemoryScrolling({
        scrollPositionRestoration: 'top', // Scroll to top on navigation
        anchorScrolling: 'enabled' // Enable anchor scrolling
      })
    ),
    provideHttpClient(withFetch()) // Enable HTTP client with fetch API
  ]
};
