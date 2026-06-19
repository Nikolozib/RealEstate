import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { PropertyService } from '../../core/services/property';
import { SeoService } from '../../core/services/seo';
import { Property } from '../../core/services/models/property.model';
import { Pagination } from '../shared/pagination/pagination';
import {
  PAGE_SIZE,
  paginateItems,
  getTotalPages,
  clampPage,
} from '../../core/utils/pagination';
import * as AOS from 'aos';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [RouterLink, Pagination],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss'
})
export class Favorites implements OnInit {
  savedProperties: Property[] = [];
  paginatedProperties: Property[] = [];
  loading = true;
  loadError = false;
  currentUserId = '';
  currentPage = 1;
  totalPages = 1;
  readonly pageSize = PAGE_SIZE;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private propertyService: PropertyService,
    private seo: SeoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.seo.setPageMeta(
      'Saved Properties | RealEstate Georgia',
      'Your saved and favorite property listings.'
    );
    AOS.init({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });

    this.authService.currentUser$.pipe(take(1)).subscribe(currentUser => {
      if (!currentUser) {
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }
      this.loadSavedProperties(currentUser.uid);
    });
  }

  async loadSavedProperties(uid: string) {
    this.loading = true;
    this.loadError = false;
    this.currentUserId = uid;
    this.currentPage = 1;

    try {
      const userData = await firstValueFrom(this.userService.getUserById(uid));

      if (!userData?.savedProperties?.length) {
        this.savedProperties = [];
        this.updatePagination();
        return;
      }

      this.savedProperties = await this.propertyService.getPropertiesByIds(
        userData.savedProperties
      );
      this.updatePagination();
      setTimeout(() => AOS.refresh(), 50);
    } catch (e) {
      console.error('Failed to load saved properties:', e);
      this.loadError = true;
      this.savedProperties = [];
      this.updatePagination();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private updatePagination() {
    this.totalPages = getTotalPages(this.savedProperties.length, this.pageSize);
    this.currentPage = clampPage(this.currentPage, this.totalPages);
    this.paginatedProperties = paginateItems(
      this.savedProperties,
      this.currentPage,
      this.pageSize
    );
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.paginatedProperties = paginateItems(
      this.savedProperties,
      this.currentPage,
      this.pageSize
    );
    setTimeout(() => AOS.refresh(), 50);
    document.querySelector('.favorites-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async unsave(propertyId: string) {
    this.savedProperties = this.savedProperties.filter(p => p.id !== propertyId);
    this.updatePagination();
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
      this.updatePagination();
    }
    try {
      await this.userService.unsaveProperty(this.currentUserId, propertyId);
    } catch (e) {
      console.error('Failed to unsave:', e);
      await this.loadSavedProperties(this.currentUserId);
    }
  }

  formatPrice(price: number, type: string): string {
    if (type === 'rent') return `$${price.toLocaleString()}/mo`;
    return `$${price.toLocaleString()}`;
  }
}
