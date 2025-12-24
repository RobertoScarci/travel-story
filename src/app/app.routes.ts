import { Routes } from '@angular/router';

/**
 * Application Routes
 * 
 * Architecture:
 * - Lazy loading for all feature modules
 * - Clean, readable URLs
 * - Progressive disclosure through routing
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    title: 'TravelStory - Scopri il mondo, una storia alla volta'
  },
  {
    path: 'city/:id',
    loadComponent: () => import('./pages/city/city.component').then(m => m.CityComponent),
    title: 'Esplora - TravelStory'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login.component').then(m => m.LoginComponent),
    title: 'Accedi - TravelStory'
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register.component').then(m => m.RegisterComponent),
    title: 'Registrati - TravelStory'
  },
  {
    path: 'destinations',
    loadComponent: () => import('./pages/destinations/destinations.component').then(m => m.DestinationsComponent),
    title: 'Tutte le Destinazioni - TravelStory'
  },
  {
    path: 'compare',
    loadComponent: () => import('./pages/compare/compare.component').then(m => m.CompareComponent),
    title: 'Confronta Destinazioni - TravelStory'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
