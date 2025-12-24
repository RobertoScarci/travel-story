import { ApplicationConfig } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';

/**
 * Application Configuration
 * 
 * Features:
 * - View transitions for smooth page changes
 * - Lazy loading through route configuration
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions() // Enable smooth page transitions
    )
  ]
};
