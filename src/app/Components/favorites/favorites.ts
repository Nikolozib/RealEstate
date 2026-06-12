import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { PropertyService } from '../../core/services/property';
import { SeoService } from '../../core/services/seo';
import { Property } from '../../core/services/models/property.model';
import * as AOS from 'aos';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss'
})
export class Favorites implements OnInit {
  savedProperties: Property[] = [];
  loading = true;
  currentUserId = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private propertyService: PropertyService,
    private seo: SeoService
  ) {}

  ngOnInit() {
    this.seo.setPageMeta(
      'Saved Properties | RealEstate Georgia',
      'Your saved and favorite property listings.'
    );

    AOS.init({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });

    this.authService.isLoggedIn$.subscribe(loggedIn => {
      if (loggedIn) {
        this.loadSavedProperties();
      }
    });
  }

  loadSavedProperties() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.currentUserId = user.uid;

    this.userService.getUserById(user.uid).subscribe(userData => {
      if (!userData?.savedProperties?.length) {
        this.savedProperties = [];
        this.loading = false;
        return;
      }

      const ids = userData.savedProperties;
      const fetched: Property[] = [];
      let count = 0;

      ids.forEach(id => {
        this.propertyService.getPropertyById(id).subscribe(prop => {
          if (prop) fetched.push(prop);
          count++;
          if (count === ids.length) {
            this.savedProperties = fetched;
            this.loading = false;
          }
        });
      });
    });
  }

  unsave(propertyId: string) {
    this.userService.unsaveProperty(this.currentUserId, propertyId);
    this.savedProperties = this.savedProperties.filter(p => p.id !== propertyId);
  }

  formatPrice(price: number, type: string): string {
    if (type === 'rent') return `$${price.toLocaleString()}/mo`;
    return `$${price.toLocaleString()}`;
  }
}