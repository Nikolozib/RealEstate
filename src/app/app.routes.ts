import { Routes } from '@angular/router';
import { About } from './Components/about/about';
import { Contact } from './Components/contact/contact';
import { Favorites } from './Components/favorites/favorites';
import { Home } from './Components/home/home';
import { Listings } from './Components/listings/listings';
import { Login } from './Components/login/login';
import { NotFound } from './Components/not-found/not-found';
import { Profile } from './Components/profile/profile';
import { PropertyDetail } from './Components/property-detail/property-detail';
import { Register } from './Components/register/register';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: 'favorites', component: Favorites },
  { path: 'listings', component: Listings },
  { path: 'login', component: Login },
  { path: 'profile', component: Profile },
  { path: 'property-detail', component: PropertyDetail },
  { path: 'register', component: Register },
  { path: '**', component: NotFound },
];
