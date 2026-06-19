import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../core/services/property';
import { Property } from '../../core/services/models/property.model';
import { SeoService } from '../../core/services/seo';
import { Pagination } from '../shared/pagination/pagination';
import {
  PAGE_SIZE,
  paginateItems,
  getTotalPages,
  clampPage,
} from '../../core/utils/pagination';
import * as AOS from 'aos';

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [RouterLink, FormsModule, Pagination],
  templateUrl: './listings.html',
  styleUrl: './listings.scss'
})
export class Listings implements OnInit {
  allProperties: Property[] = [];
  filteredProperties: Property[] = [];
  paginatedProperties: Property[] = [];
  loading = true;
  loadError = false;
  currentPage = 1;
  totalPages = 1;
  readonly pageSize = PAGE_SIZE;

  searchQuery = '';
  selectedPriceType = '';
  selectedPropertyType = '';
  selectedCity = '';
  selectedBedrooms = '';
  sortBy = 'newest';

  priceMin = 0;
  priceMax = 1000000;
  stepSize = 5000;
  priceRange = [0, 1000000];

  filtersOpen = false;
  activeFilterCount = 0;

  priceTypes = [
    { value: '', label: 'Sale & Rent' },
    { value: 'sale', label: 'For Sale' },
    { value: 'rent', label: 'For Rent' }
  ];

  propertyTypes = [
    { value: '', label: 'All Types' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'villa', label: 'Villa' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'land', label: 'Land' }
  ];

  cities = [
    { value: '', label: 'All Cities' },
    { value: 'Tbilisi', label: 'Tbilisi' },
    { value: 'Batumi', label: 'Batumi' },
    { value: 'Rustavi', label: 'Rustavi' },
    { value: 'Kutaisi', label: 'Kutaisi' },
    { value: 'Mtskheta', label: 'Mtskheta' },
    { value: 'Telavi', label: 'Telavi' },
    { value: 'Ureki', label: 'Ureki' }
  ];

  bedroomOptions = [
    { value: '', label: 'Any' },
    { value: '1', label: '1+' },
    { value: '2', label: '2+' },
    { value: '3', label: '3+' },
    { value: '4', label: '4+' }
  ];

  sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'area_desc', label: 'Largest First' }
  ];

  constructor(
    private propertyService: PropertyService,
    private seo: SeoService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.seo.setPageMeta(
      'Properties | RealEstate Georgia',
      'Browse all apartments, houses, villas and land for sale and rent in Georgia.'
    );

    this.route.queryParams.subscribe(params => {
      if (params['type']) this.selectedPropertyType = params['type'];
      if (params['priceType']) this.selectedPriceType = params['priceType'];
    });

    this.loadProperties();
    AOS.init({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });
  }

  private getFirestoreFilters() {
    return {
      priceType: this.selectedPriceType || undefined,
      propertyType: this.selectedPropertyType || undefined,
      city: this.selectedCity || undefined,
    };
  }

  async loadProperties() {
    this.loading = true;
    this.loadError = false;
    this.allProperties = [];
    this.currentPage = 1;

    try {
      this.allProperties = await this.propertyService.getAllPropertiesFiltered(
        this.getFirestoreFilters()
      );
      this.applyFilters();
      setTimeout(() => AOS.refresh(), 50);
    } catch (err) {
      console.error('Failed to load properties:', err);
      this.loadError = true;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  retry() {
    this.loadProperties();
  }

  onFirestoreFilterChange() {
    this.loadProperties();
  }

  applyFilters() {
    let result = [...this.allProperties];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
      );
    }

    if (this.selectedBedrooms) {
      const min = parseInt(this.selectedBedrooms);
      result = result.filter(p => p.bedrooms >= min);
    }

    if (this.priceRange[0] > this.priceMin) result = result.filter(p => p.price >= this.priceRange[0]);
    if (this.priceRange[1] < this.priceMax) result = result.filter(p => p.price <= this.priceRange[1]);

    switch (this.sortBy) {
      case 'price_asc': result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'area_desc': result.sort((a, b) => b.area - a.area); break;
      default:
        result.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
    }

    this.filteredProperties = result;
    this.totalPages = getTotalPages(result.length, this.pageSize);
    this.currentPage = clampPage(this.currentPage, this.totalPages);
    this.paginatedProperties = paginateItems(result, this.currentPage, this.pageSize);
    this.countActiveFilters();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.paginatedProperties = paginateItems(
      this.filteredProperties,
      this.currentPage,
      this.pageSize
    );
    setTimeout(() => AOS.refresh(), 50);
    document.querySelector('.listings-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  countActiveFilters() {
    let count = 0;
    if (this.selectedPriceType) count++;
    if (this.selectedPropertyType) count++;
    if (this.selectedCity) count++;
    if (this.selectedBedrooms) count++;
    if (this.priceRange[0] > this.priceMin) count++;
    if (this.priceRange[1] < this.priceMax) count++;
    this.activeFilterCount = count;
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedPriceType = '';
    this.selectedPropertyType = '';
    this.selectedCity = '';
    this.selectedBedrooms = '';
    this.priceRange = [this.priceMin, this.priceMax];
    this.sortBy = 'newest';
    this.loadProperties();
  }

  toggleFilters() {
    this.filtersOpen = !this.filtersOpen;
  }

  onMinChange(value: number) {
    if (Number(value) >= this.priceRange[1]) this.priceRange[0] = this.priceRange[1] - this.stepSize;
    this.currentPage = 1;
    this.applyFilters();
  }

  onMaxChange(value: number) {
    if (Number(value) <= this.priceRange[0]) this.priceRange[1] = this.priceRange[0] + this.stepSize;
    this.currentPage = 1;
    this.applyFilters();
  }

  onClientFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  getFillStyle(): string {
    const left = (this.priceRange[0] / this.priceMax) * 100;
    const right = 100 - (this.priceRange[1] / this.priceMax) * 100;
    return `left: ${left}%; right: ${right}%`;
  }

  formatPrice(price: number, type: string): string {
    if (type === 'rent') return `$${price.toLocaleString()}/mo`;
    return `$${price.toLocaleString()}`;
  }
}
