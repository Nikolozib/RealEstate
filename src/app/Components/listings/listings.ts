import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../core/services/property';
import { Property } from '../../core/services/models/property.model';
import { SeoService } from '../../core/services/seo';
import * as AOS from 'aos';

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './listings.html',
  styleUrl: './listings.scss'
})
export class Listings implements OnInit {
  allProperties: Property[] = [];
  filteredProperties: Property[] = [];
  loading = true;

  // Filters
  searchQuery = '';
  selectedPriceType = '';
  selectedPropertyType = '';
  selectedCity = '';
  selectedBedrooms = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  sortBy = 'newest';

  // UI state
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
    { value: 'Kutaisi', label: 'Kutaisi' }
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
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.seo.setPageMeta(
      'Properties | RealEstate Georgia',
      'Browse all apartments, houses, villas and land for sale and rent in Georgia.'
    );

    // read query params from footer links
    this.route.queryParams.subscribe(params => {
      if (params['type']) this.selectedPropertyType = params['type'];
      if (params['priceType']) this.selectedPriceType = params['priceType'];
    });

    this.propertyService.getAllProperties().subscribe(props => {
      this.allProperties = props;
      this.applyFilters();
      this.loading = false;
    });

    AOS.init({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });
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

    if (this.selectedPriceType) {
      result = result.filter(p => p.priceType === this.selectedPriceType);
    }

    if (this.selectedPropertyType) {
      result = result.filter(p => p.propertyType === this.selectedPropertyType);
    }

    if (this.selectedCity) {
      result = result.filter(p => p.city === this.selectedCity);
    }

    if (this.selectedBedrooms) {
      const min = parseInt(this.selectedBedrooms);
      result = result.filter(p => p.bedrooms >= min);
    }

    if (this.minPrice !== null) {
      result = result.filter(p => p.price >= this.minPrice!);
    }

    if (this.maxPrice !== null) {
      result = result.filter(p => p.price <= this.maxPrice!);
    }

    // Sort
    switch (this.sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'area_desc':
        result.sort((a, b) => b.area - a.area);
        break;
      default:
        result.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
    }

    this.filteredProperties = result;
    this.countActiveFilters();
  }

  countActiveFilters() {
    let count = 0;
    if (this.selectedPriceType) count++;
    if (this.selectedPropertyType) count++;
    if (this.selectedCity) count++;
    if (this.selectedBedrooms) count++;
    if (this.minPrice !== null) count++;
    if (this.maxPrice !== null) count++;
    this.activeFilterCount = count;
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedPriceType = '';
    this.selectedPropertyType = '';
    this.selectedCity = '';
    this.selectedBedrooms = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.sortBy = 'newest';
    this.applyFilters();
  }

  toggleFilters() {
    this.filtersOpen = !this.filtersOpen;
  }

  formatPrice(price: number, type: string): string {
    if (type === 'rent') return `$${price.toLocaleString()}/mo`;
    return `$${price.toLocaleString()}`;
  }
}