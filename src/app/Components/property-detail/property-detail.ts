import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../core/services/property';
import { InquiryService } from '../../core/services/inquiry';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { SeoService } from '../../core/services/seo';
import { Property } from '../../core/services/models/property.model';
import * as AOS from 'aos';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './property-detail.html',
  styleUrl: './property-detail.scss',
})
export class PropertyDetail implements OnInit {
  property: Property | null = null;
  loading = true;
  notFound = false;

  // Gallery
  activeImage = '';
  lightboxOpen = false;

  // Auth
  isLoggedIn = false;
  currentUserId = '';
  isSaved = false;

  // Inquiry form
  inquiryName = '';
  inquiryEmail = '';
  inquiryPhone = '';
  inquiryMessage = '';
  inquirySending = false;
  inquirySent = false;
  inquiryError = '';

  constructor(
    private route: ActivatedRoute,
    private propertyService: PropertyService,
    private inquiryService: InquiryService,
    private authService: AuthService,
    private userService: UserService,
    private seo: SeoService,
  ) {}

  ngOnInit() {
    AOS.init({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });

    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound = true;
      this.loading = false;
      return;
    }

    this.propertyService.getPropertyById(id).subscribe((prop) => {
      if (!prop) {
        this.notFound = true;
        this.loading = false;
        return;
      }
      this.property = prop;
      this.activeImage = prop.thumbnailUrl;
      this.loading = false;
      this.propertyService.incrementViews(id);
      this.seo.setPageMeta(
        `${prop.title} | RealEstate Georgia`,
        `${prop.propertyType} in ${prop.district}, ${prop.city}. ${prop.bedrooms} beds, ${prop.area}m². ${prop.priceType === 'rent' ? 'For rent' : 'For sale'} at $${prop.price.toLocaleString()}.`,
      );
    });
  }

  setActiveImage(url: string) {
    this.activeImage = url;
  }

  openLightbox(url: string) {
    this.activeImage = url;
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.lightboxOpen = false;
    document.body.style.overflow = '';
  }

  getAllImages(): string[] {
    if (!this.property) return [];
    const imgs = [this.property.thumbnailUrl, ...this.property.images].filter(
      (i) => i && i.trim() !== '',
    );
    return [...new Set(imgs)];
  }

  toggleSave() {
    if (!this.isLoggedIn || !this.property?.id) return;
    if (this.isSaved) {
      this.userService.unsaveProperty(this.currentUserId, this.property.id);
      this.isSaved = false;
    } else {
      this.userService.saveProperty(this.currentUserId, this.property.id);
      this.isSaved = true;
    }
  }

  async sendInquiry() {
    if (!this.property) return;
    if (!this.inquiryName || !this.inquiryEmail || !this.inquiryMessage) {
      this.inquiryError = 'Please fill in all required fields.';
      return;
    }

    this.inquirySending = true;
    this.inquiryError = '';

    try {
      await this.inquiryService.sendInquiry({
        propertyId: this.property.id ?? '',
        propertyTitle: this.property.title,
        senderName: this.inquiryName,
        senderEmail: this.inquiryEmail,
        senderPhone: this.inquiryPhone,
        message: this.inquiryMessage,
        userId: this.currentUserId || null,
        agentId: this.property.agentId ?? '',
        status: 'new',
      });
      this.inquirySent = true;
      this.inquiryName = '';
      this.inquiryEmail = '';
      this.inquiryPhone = '';
      this.inquiryMessage = '';
    } catch (e) {
      this.inquiryError = 'Something went wrong. Please try again.';
    } finally {
      this.inquirySending = false;
    }
  }

  formatPrice(price: number, type: string): string {
    if (type === 'rent') return `$${price.toLocaleString()}/mo`;
    return `$${price.toLocaleString()}`;
  }

  getDetails(): { icon: string; label: string; value: string }[] {
    if (!this.property) return [];
    const p = this.property;
    const details = [
      { icon: 'fa-solid fa-vector-square', label: 'Area', value: `${p.area} m²` },
      {
        icon: 'fa-solid fa-bed',
        label: 'Bedrooms',
        value: p.bedrooms > 0 ? `${p.bedrooms}` : 'N/A',
      },
      {
        icon: 'fa-solid fa-bath',
        label: 'Bathrooms',
        value: p.bathrooms > 0 ? `${p.bathrooms}` : 'N/A',
      },
      {
        icon: 'fa-solid fa-layer-group',
        label: 'Floor',
        value: p.floor > 0 ? `${p.floor} / ${p.totalFloors}` : 'N/A',
      },
      {
        icon: 'fa-solid fa-calendar',
        label: 'Year Built',
        value: p.yearBuilt > 0 ? `${p.yearBuilt}` : 'N/A',
      },
      {
        icon: 'fa-solid fa-car',
        label: 'Parking',
        value: p.parkingSpots > 0 ? `${p.parkingSpots} spot(s)` : 'None',
      },
      { icon: 'fa-solid fa-tag', label: 'Type', value: p.propertyType },
      { icon: 'fa-solid fa-circle-check', label: 'Status', value: p.status },
    ];
    return details;
  }
}
