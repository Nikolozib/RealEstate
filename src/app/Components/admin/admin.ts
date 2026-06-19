import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { PropertyService } from '../../core/services/property';
import { InquiryService } from '../../core/services/inquiry';
import { SeoService } from '../../core/services/seo';
import { Property } from '../../core/services/models/property.model';
import { Inquiry } from '../../core/services/models/inquiry.model';
import { serverTimestamp } from '@angular/fire/firestore';
import { Pagination } from '../shared/pagination/pagination';
import {
  PAGE_SIZE,
  paginateItems,
  getTotalPages,
  clampPage,
} from '../../core/utils/pagination';
import * as AOS from 'aos';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, FormsModule, Pagination],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  activeTab = 'properties';
  loading = true;
  isAdmin = false;

  properties: Property[] = [];
  paginatedProperties: Property[] = [];
  inquiries: Inquiry[] = [];
  paginatedInquiries: Inquiry[] = [];
  propertiesPage = 1;
  inquiriesPage = 1;
  propertiesTotalPages = 1;
  inquiriesTotalPages = 1;
  readonly pageSize = PAGE_SIZE;

  formMode: 'add' | 'edit' | null = null;
  editingId: string | null = null;
  formSaving = false;
  formError = '';
  formSuccess = '';
  deleteConfirmId: string | null = null;

  form = this.emptyForm();

  propertyTypes = ['apartment', 'house', 'villa', 'commercial', 'land'];
  priceTypes = ['sale', 'rent'];
  statusOptions = ['available', 'sold', 'rented'];
  featureOptions = [
    'balcony', 'elevator', 'furnished', 'pool',
    'garden', 'parking', 'security', 'gym',
  ];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private propertyService: PropertyService,
    private inquiryService: InquiryService,
    private seo: SeoService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.seo.setPageMeta('Admin Panel | RealEstate Georgia', 'Manage properties and inquiries.');
    AOS.init({ duration: 600, easing: 'ease-in-out', once: true });

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // take(1) — we only need the role check once, not a live stream
    this.userService.getUserById(user.uid).pipe(take(1)).subscribe((userData) => {
      if (userData?.role !== 'admin' && userData?.role !== 'agent') {
        this.router.navigate(['/']);
        return;
      }
      this.isAdmin = true;
      this.loadData();
    });
  }

  async loadData() {
    this.loading = true;
    try {
      // Single getDocs call — no persistent listener
      this.properties = await this.propertyService.getAllPropertiesForAdmin();

      // Inquiries: keep existing Observable but complete it immediately
      this.inquiries = await firstValueFrom(
        this.inquiryService.getInquiriesByAgent('').pipe(take(1))
      );
      this.updatePropertiesPagination();
      this.updateInquiriesPagination();
      setTimeout(() => AOS.refresh(), 50);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.formMode = null;
    this.formError = '';
    this.formSuccess = '';
  }

  private updatePropertiesPagination() {
    this.propertiesTotalPages = getTotalPages(this.properties.length, this.pageSize);
    this.propertiesPage = clampPage(this.propertiesPage, this.propertiesTotalPages);
    this.paginatedProperties = paginateItems(
      this.properties,
      this.propertiesPage,
      this.pageSize
    );
  }

  private updateInquiriesPagination() {
    this.inquiriesTotalPages = getTotalPages(this.inquiries.length, this.pageSize);
    this.inquiriesPage = clampPage(this.inquiriesPage, this.inquiriesTotalPages);
    this.paginatedInquiries = paginateItems(
      this.inquiries,
      this.inquiriesPage,
      this.pageSize
    );
  }

  onPropertiesPageChange(page: number) {
    this.propertiesPage = page;
    this.paginatedProperties = paginateItems(
      this.properties,
      this.propertiesPage,
      this.pageSize
    );
  }

  onInquiriesPageChange(page: number) {
    this.inquiriesPage = page;
    this.paginatedInquiries = paginateItems(
      this.inquiries,
      this.inquiriesPage,
      this.pageSize
    );
  }

  emptyForm() {
    return {
      title: '',
      description: '',
      price: 0,
      priceType: 'sale',
      propertyType: 'apartment',
      status: 'available',
      city: 'Tbilisi',
      district: '',
      address: '',
      bedrooms: 1,
      bathrooms: 1,
      area: 0,
      floor: 1,
      totalFloors: 1,
      yearBuilt: 2020,
      parkingSpots: 0,
      thumbnailUrl: '',
      isFeatured: false,
      features: [] as string[],
    };
  }

  openAddForm() {
    this.form = this.emptyForm();
    this.editingId = null;
    this.formMode = 'add';
    this.formError = '';
    this.formSuccess = '';
    setTimeout(
      () => document.getElementById('form-top')?.scrollIntoView({ behavior: 'smooth' }),
      100,
    );
  }

  openEditForm(property: Property) {
    this.form = {
      title: property.title,
      description: property.description,
      price: property.price,
      priceType: property.priceType,
      propertyType: property.propertyType,
      status: property.status,
      city: property.city,
      district: property.district,
      address: property.address,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      floor: property.floor,
      totalFloors: property.totalFloors,
      yearBuilt: property.yearBuilt,
      parkingSpots: property.parkingSpots,
      thumbnailUrl: property.thumbnailUrl,
      isFeatured: property.isFeatured,
      features: [...(property.features || [])],
    };
    this.editingId = property.id ?? null;
    this.formMode = 'edit';
    this.formError = '';
    this.formSuccess = '';
    setTimeout(
      () => document.getElementById('form-top')?.scrollIntoView({ behavior: 'smooth' }),
      100,
    );
  }

  cancelForm() {
    this.formMode = null;
    this.editingId = null;
    this.formError = '';
  }

  toggleFeature(feature: string) {
    const idx = this.form.features.indexOf(feature);
    if (idx > -1) this.form.features.splice(idx, 1);
    else this.form.features.push(feature);
  }

  hasFeature(feature: string): boolean {
    return this.form.features.includes(feature);
  }

  async saveProperty() {
    if (!this.form.title || !this.form.price || !this.form.area) {
      this.formError = 'Title, price and area are required.';
      return;
    }

    this.formSaving = true;
    this.formError = '';

    const existingProp = this.properties.find((p) => p.id === this.editingId);

    const data = {
      ...this.form,
      price: Number(this.form.price),
      bedrooms: Number(this.form.bedrooms),
      bathrooms: Number(this.form.bathrooms),
      area: Number(this.form.area),
      floor: Number(this.form.floor),
      totalFloors: Number(this.form.totalFloors),
      yearBuilt: Number(this.form.yearBuilt),
      parkingSpots: Number(this.form.parkingSpots),
      images: [] as string[],
      coordinates: { lat: 41.6938, lng: 44.8015 },
      agentId: this.authService.getCurrentUser()?.uid ?? '',
      views: this.formMode === 'add' ? 0 : (existingProp?.views ?? 0),
      createdAt:
        this.formMode === 'add'
          ? serverTimestamp()
          : (existingProp?.createdAt ?? serverTimestamp()),
      updatedAt: serverTimestamp(),
    };

    try {
      if (this.formMode === 'add') {
        await this.propertyService.addProperty(data);
        this.formSuccess = 'Property added successfully!';
      } else if (this.editingId) {
        await this.propertyService.updateProperty(this.editingId, data);
        this.formSuccess = 'Property updated successfully!';
      }
      this.formMode = null;
      this.editingId = null;
      // Reload the list so the new/updated item appears immediately
      await this.loadData();
      setTimeout(() => (this.formSuccess = ''), 3000);
    } catch (e) {
      this.formError = 'Failed to save property. Please try again.';
    } finally {
      this.formSaving = false;
    }
  }

  confirmDelete(id: string) {
    this.deleteConfirmId = id;
  }

  cancelDelete() {
    this.deleteConfirmId = null;
  }

  async deleteProperty(id: string) {
    try {
      await this.propertyService.deleteProperty(id);
      this.deleteConfirmId = null;
      // Remove locally for instant feedback, then reload to sync
      this.properties = this.properties.filter(p => p.id !== id);
      this.updatePropertiesPagination();
      this.formSuccess = 'Property deleted.';
      setTimeout(() => (this.formSuccess = ''), 3000);
    } catch (e) {
      this.formError = 'Failed to delete property.';
    }
  }

  async markInquiryRead(id: string) {
    await this.inquiryService.updateInquiryStatus(id, 'read');
    // Update locally so the UI reflects the change without a full reload
    const inq = this.inquiries.find(i => i.id === id);
    if (inq) inq.status = 'read';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      available: 'green', sold: 'red', rented: 'orange',
    };
    return map[status] ?? 'grey';
  }

  getInquiryStatusColor(status: string): string {
    const map: Record<string, string> = {
      new: 'blue', read: 'grey', replied: 'green',
    };
    return map[status] ?? 'grey';
  }

  formatPrice(price: number, type: string): string {
    if (type === 'rent') return `$${price.toLocaleString()}/mo`;
    return `$${price.toLocaleString()}`;
  }
}