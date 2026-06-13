import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { PropertyService } from '../../core/services/property';
import { InquiryService } from '../../core/services/inquiry';
import { SeoService } from '../../core/services/seo';
import { Property } from '../../core/services/models/property.model';
import { Inquiry } from '../../core/services/models/inquiry.model';
import { serverTimestamp, Timestamp } from '@angular/fire/firestore';
import * as AOS from 'aos';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  activeTab = 'properties';
  loading = true;
  isAdmin = false;

  properties: Property[] = [];
  inquiries: Inquiry[] = [];

  // Add/Edit form
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
    'balcony',
    'elevator',
    'furnished',
    'pool',
    'garden',
    'parking',
    'security',
    'gym',
  ];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private propertyService: PropertyService,
    private inquiryService: InquiryService,
    private seo: SeoService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.seo.setPageMeta('Admin Panel | RealEstate Georgia', 'Manage properties and inquiries.');
    AOS.init({ duration: 600, easing: 'ease-in-out', once: true });

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.userService.getUserById(user.uid).subscribe((userData) => {
      if (userData?.role !== 'admin' && userData?.role !== 'agent') {
        this.router.navigate(['/']);
        return;
      }
      this.isAdmin = true;
      this.loadData();
    });
  }

  loadData() {
    this.propertyService.getAllProperties().subscribe((props) => {
      this.properties = props;
      this.loading = false;
    });

    this.inquiryService.getInquiriesByAgent('').subscribe((inq) => {
      this.inquiries = inq;
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.formMode = null;
    this.formError = '';
    this.formSuccess = '';
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
    if (idx > -1) {
      this.form.features.splice(idx, 1);
    } else {
      this.form.features.push(feature);
    }
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
      this.formSuccess = 'Property deleted.';
      setTimeout(() => (this.formSuccess = ''), 3000);
    } catch (e) {
      this.formError = 'Failed to delete property.';
    }
  }

  async markInquiryRead(id: string) {
    await this.inquiryService.updateInquiryStatus(id, 'read');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'available':
        return 'green';
      case 'sold':
        return 'red';
      case 'rented':
        return 'orange';
      default:
        return 'grey';
    }
  }

  getInquiryStatusColor(status: string): string {
    switch (status) {
      case 'new':
        return 'blue';
      case 'read':
        return 'grey';
      case 'replied':
        return 'green';
      default:
        return 'grey';
    }
  }

  formatPrice(price: number, type: string): string {
    if (type === 'rent') return `$${price.toLocaleString()}/mo`;
    return `$${price.toLocaleString()}`;
  }
}
