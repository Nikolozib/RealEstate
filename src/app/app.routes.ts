import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';
import { guestGuard } from './core/guards/guest-guard';
import { propertyResolver } from './core/guards/property-resolver';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./Components/home/home').then(m => m.Home),
  },
  {
    path: 'about',
    loadComponent: () => import('./Components/about/about').then(m => m.About),
  },
  {
    path: 'contact',
    loadComponent: () => import('./Components/contact/contact').then(m => m.Contact),
  },
  {
    path: 'listings',
    loadComponent: () => import('./Components/listings/listings').then(m => m.Listings),
  },
  {
    path: 'listings/:id',
    loadComponent: () =>
      import('./Components/property-detail/property-detail').then(m => m.PropertyDetail),
    resolve: { property: propertyResolver },
  },

  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./Components/Auth/login/login').then(m => m.Login),
        canActivate: [guestGuard],
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./Components/Auth/register/register').then(m => m.Register),
        canActivate: [guestGuard],
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  {
    path: 'favorites',
    loadComponent: () => import('./Components/favorites/favorites').then(m => m.Favorites),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./Components/profile/profile').then(m => m.Profile),
    canActivate: [authGuard],
  },

  {
    path: 'admin',
    loadComponent: () => import('./Components/admin/admin').then(m => m.Admin),
    canActivate: [adminGuard],
  },

  {
    path: '**',
    loadComponent: () => import('./Components/not-found/not-found').then(m => m.NotFound),
  },
];
