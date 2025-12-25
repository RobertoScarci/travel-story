/**
 * Environment configuration
 * 
 * API Keys configuration for external services.
 * For production, create environment.prod.ts with real keys.
 */
export const environment = {
  production: false,
  
  // Free APIs (no key required)
  apis: {
    openMeteo: 'https://api.open-meteo.com/v1',
    restCountries: 'https://restcountries.com/v3.1',
    wikipedia: 'https://en.wikipedia.org/api/rest_v1',
    wikipediaIt: 'https://it.wikipedia.org/api/rest_v1',
  },

  // APIs that require keys
  apiKeys: {
    unsplash: 'NIzWTuESE-e_mJM9X5QxyOAOTSmnaZ2w99gFu7USZwQ',
    openTripMap: '', // Get from https://opentripmap.io/product
    geoapify: '', // Get from https://www.geoapify.com/
  }
};

