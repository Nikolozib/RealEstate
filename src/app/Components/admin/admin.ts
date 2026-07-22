import { Component, OnInit, ChangeDetectorRef, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { PropertyService } from '../../core/services/property';
import { InquiryService } from '../../core/services/inquiry';
import { SeoService } from '../../core/services/seo';
import { ToastService } from '../../core/services/toast';
import { StorageService } from '../../core/services/storage';
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
import { initAos } from '../../core/utils/aos';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Pagination, NgOptimizedImage],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  activeTab = 'properties';
  loading = true;
  isAdmin = false;

  properties: Property[] = [];
  inquiries: Inquiry[] = [];
  paginatedInquiries: Inquiry[] = [];
  inquiriesPage = 1;
  inquiriesTotalPages = 1;
  readonly pageSize = PAGE_SIZE;

  formMode: 'add' | 'edit' | null = null;
  editingId: string | null = null;
  formSaving = false;
  formError = '';
  formSuccess = '';
  deleteConfirmId: string | null = null;

  features: string[] = [];
  images: string[] = [];
  thumbnailUploading = false;
  galleryUploading = false;

  propertyTypes = ['apartment', 'house', 'villa', 'commercial', 'land'];
  priceTypes = ['sale', 'rent'];
  statusOptions = ['available', 'sold', 'rented'];
  featureOptions = [
    'balcony', 'elevator', 'furnished', 'pool',
    'garden', 'parking', 'security', 'gym',
  ];

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private fb = inject(FormBuilder);

  propertyForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(1)]],
    priceType: ['sale'],
    propertyType: ['apartment'],
    status: ['available'],
    city: ['Tbilisi'],
    district: [''],
    address: [''],
    bedrooms: [1],
    bathrooms: [1],
    area: [0, [Validators.required, Validators.min(1)]],
    floor: [1],
    totalFloors: [1],
    yearBuilt: [2020],
    parkingSpots: [0],
    thumbnailUrl: [''],
    isFeatured: [false],
  });

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private propertyService: PropertyService,
    private inquiryService: InquiryService,
    private seo: SeoService,
    private toast: ToastService,
    private storageService: StorageService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.seo.setPageMeta('Admin Panel | RealEstate Georgia', 'Manage properties and inquiries.');
    if (this.isBrowser) initAos({ duration: 600, easing: 'ease-in-out', once: true });

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
      this.properties = await this.propertyService.getAllPropertiesForAdmin();

      this.inquiries = await firstValueFrom(
        this.inquiryService.getInquiriesByAgent('').pipe(take(1))
      );
      this.updateInquiriesPagination();
      if (this.isBrowser) setTimeout(() => AOS.refresh(), 50);
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

  private updateInquiriesPagination() {
    this.inquiriesTotalPages = getTotalPages(this.inquiries.length, this.pageSize);
    this.inquiriesPage = clampPage(this.inquiriesPage, this.inquiriesTotalPages);
    this.paginatedInquiries = paginateItems(
      this.inquiries,
      this.inquiriesPage,
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

  openAddForm() {
    this.propertyForm.reset({
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
    });
    this.features = [];
    this.images = [];
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
    this.propertyForm.reset({
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
    });
    this.features = [...(property.features || [])];
    this.images = [...(property.images || [])];
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
    const idx = this.features.indexOf(feature);
    if (idx > -1) this.features.splice(idx, 1);
    else this.features.push(feature);
  }

  hasFeature(feature: string): boolean {
    return this.features.includes(feature);
  }

  // Compresses (resize + WebP re-encode) in the browser, then uploads to
  // Firebase Storage — see core/utils/image-compress.ts and
  // core/services/storage.ts. Only the resulting download URL ever touches
  // Firestore; the original file never leaves compressed.
  async onThumbnailSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file later
    if (!file) return;

    this.thumbnailUploading = true;
    try {
      const url = await this.storageService.uploadPropertyImage(file);
      this.propertyForm.patchValue({ thumbnailUrl: url });
    } catch (e) {
      this.toast.error('Failed to upload image. Please try again.');
    } finally {
      this.thumbnailUploading = false;
    }
  }

  async onGalleryFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    this.galleryUploading = true;
    try {
      // Sequential, not Promise.all: keeps memory bounded (each compress
      // step holds a full-size decoded bitmap) when an admin selects a
      // dozen photos from a phone at once.
      for (const file of files) {
        const url = await this.storageService.uploadPropertyImage(file);
        this.images.push(url);
      }
    } catch (e) {
      this.toast.error('Some images failed to upload. Please try again.');
    } finally {
      this.galleryUploading = false;
    }
  }

  removeGalleryImage(index: number): void {
    const [removed] = this.images.splice(index, 1);
    if (removed) this.storageService.deletePropertyImage(removed);
  }

  async saveProperty() {
    if (this.propertyForm.invalid) {
      this.propertyForm.markAllAsTouched();
      this.formError = 'Title, price and area are required.';
      return;
    }

    this.formSaving = true;
    this.formError = '';

    const existingProp = this.properties.find((p) => p.id === this.editingId);
    const formValue = this.propertyForm.getRawValue();

    const data = {
      ...formValue,
      features: this.features,
      price: Number(formValue.price),
      bedrooms: Number(formValue.bedrooms),
      bathrooms: Number(formValue.bathrooms),
      area: Number(formValue.area),
      floor: Number(formValue.floor),
      totalFloors: Number(formValue.totalFloors),
      yearBuilt: Number(formValue.yearBuilt),
      parkingSpots: Number(formValue.parkingSpots),
      images: this.images,
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
      this.toast.success(this.formSuccess);
      this.formMode = null;
      this.editingId = null;
      await this.loadData();
      setTimeout(() => (this.formSuccess = ''), 3000);
    } catch (e) {
      this.formError = 'Failed to save property. Please try again.';
      this.toast.error(this.formError);
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
      this.properties = this.properties.filter(p => p.id !== id);
      this.formSuccess = 'Property deleted.';
      this.toast.success(this.formSuccess);
      setTimeout(() => (this.formSuccess = ''), 3000);
    } catch (e) {
      this.formError = 'Failed to delete property.';
      this.toast.error(this.formError);
    }
  }

  async markInquiryRead(id: string) {
    await this.inquiryService.updateInquiryStatus(id, 'read');
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