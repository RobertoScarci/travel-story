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
    pexels: 'VTAodSPomd13ieMcZXmCVNqnfg3PkqG3avB2xrjYKIs34TvpDJ7BWZoz', // 200 req/hour free
    openTripMap: '5ae2e3f221c38a28845f05b63d6d8a9a51588cfc90a375982bed06cd',
    foursquare: 'ZIDAG2JIWWBFJDZU3G4HNSBVQGV43FKJ5KHHAMQIAMEBHYIB',
    geoapify: '', // Get from https://www.geoapify.com/
  }
};

