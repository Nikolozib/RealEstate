import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { About } from './Components/about/about';
import { Contact } from './Components/contact/contact';
import { Favorites } from './Components/favorites/favorites';
import { Home } from './Components/home/home';
import { Listings } from './Components/listings/listings';
import { Login } from './Components/Auth/login/login';
import { NotFound } from './Components/not-found/not-found';
import { Profile } from './Components/profile/profile';
import { PropertyDetail } from './Components/property-detail/property-detail';
import { Register } from './Components/Auth/register/register';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: 'favorites', component: Favorites, canActivate: [authGuard] },
  { path: 'listings', component: Listings },
  {
    path: 'auth',
    children: [
      { path: 'login', component: Login },
      { path: 'register', component: Register },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'property-detail', component: PropertyDetail, canActivate: [authGuard] },
  { path: '**', component: NotFound },
];
