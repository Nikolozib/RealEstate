import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs/operators';
import { PropertyService } from '../../core/services/property';
import { InquiryService } from '../../core/services/inquiry';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { SeoService } from '../../core/services/seo';
import { Property } from '../../core/services/models/property.model';
import {
  isValidEmail,
  isValidMessage,
  isValidName,
  isValidPhone,
} from '../../core/utils/validation';
import * as AOS from 'aos';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './property-detail.html',
  styleUrl: './property-detail.scss'
})
export class PropertyDetail implements OnInit {
  property: Property | null = null;
  loading = true;
  notFound = false;

  activeImage = '';
  lightboxOpen = false;

  isLoggedIn = false;
  currentUserId = '';
  isSaved = false;

  inquiryName = '';
  inquiryEmail = '';
  inquiryPhone = '';
  inquiryMessage = '';
  inquirySending = false;
  inquirySent = false;
  inquiryError = '';

  @ViewChild('inquirySuccessBox') inquirySuccessBox?: ElementRef<HTMLElement>;

  constructor(
    private route: ActivatedRoute,
    private propertyService: PropertyService,
    private inquiryService: InquiryService,
    private authService: AuthService,
    private userService: UserService,
    private seo: SeoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    AOS.init({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });

    this.authService.currentUser$.subscribe(u => {
      this.isLoggedIn = !!u && u.emailVerified;
      this.currentUserId = u?.uid ?? '';

      if (u && u.emailVerified) {
        this.userService.getUserById(u.uid).pipe(take(1)).subscribe(userData => {
          this.isSaved = userData?.savedProperties?.includes(this.property?.id ?? '') ?? false;
          this.cdr.detectChanges();
        });
      } else {
        this.cdr.detectChanges();
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.notFound = true; this.loading = false; return; }

    this.propertyService.getPropertyById(id).subscribe({
      next: (prop) => {
        if (!prop) {
          this.notFound = true;
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }
        this.property = prop;
        this.activeImage = prop.thumbnailUrl;
        this.loading = false;
        this.propertyService.incrementViews(id);
        this.seo.setPageMeta(
          `${prop.title} | RealEstate Georgia`,
          `${prop.propertyType} in ${prop.district}, ${prop.city}. ${prop.bedrooms} beds, ${prop.area}m².`
        );
        this.cdr.detectChanges();
      },
      error: () => {
        this.notFound = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
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
    const imgs = [this.property.thumbnailUrl, ...this.property.images].filter(i => i && i.trim() !== '');
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
      this.cdr.detectChanges();
      return;
    }

    if (!isValidName(this.inquiryName)) {
      this.inquiryError = 'Please enter a valid name (letters only, at least 2 characters).';
      this.cdr.detectChanges();
      return;
    }

    if (!isValidEmail(this.inquiryEmail)) {
      this.inquiryError = 'Please enter a valid email address.';
      this.cdr.detectChanges();
      return;
    }

    if (this.inquiryPhone.trim() && !isValidPhone(this.inquiryPhone)) {
      this.inquiryError = 'Please enter a valid phone number (digits only, 7–15 digits).';
      this.cdr.detectChanges();
      return;
    }

    if (!isValidMessage(this.inquiryMessage)) {
      this.inquiryError = 'Message must be at least 10 characters.';
      this.cdr.detectChanges();
      return;
    }

    this.inquirySending = true;
    this.inquiryError = '';
    this.cdr.detectChanges();

    try {
      await this.inquiryService.sendInquiry({
        propertyId: this.property.id ?? '',
        propertyTitle: this.property.title,
        senderName: this.inquiryName,
        senderEmail: this.inquiryEmail,
        senderPhone: this.inquiryPhone,
        message: this.inquiryMessage,
        userId: this.currentUserId || null,
        agentId: this.property.agentId ?? ''
      });
      this.inquirySent = true;
      this.inquiryName = '';
      this.inquiryEmail = '';
      this.inquiryPhone = '';
      this.inquiryMessage = '';
      // The success box replaces the form in place; if the user scrolled down
      // to reach the submit button, it renders above the fold. detectChanges()
      // forces Angular to paint it synchronously (this app is zoneless, so
      // nothing does that automatically), so the ViewChild is already
      // resolved by the time we scroll to it.
      this.cdr.detectChanges();
      this.inquirySuccessBox?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      this.inquiryError = 'Something went wrong. Please try again.';
    } finally {
      this.inquirySending = false;
      this.cdr.detectChanges();
    }
  }

  formatPrice(price: number, type: string): string {
    if (type === 'rent') return `$${price.toLocaleString()}/mo`;
    return `$${price.toLocaleString()}`;
  }

  getDetails(): { icon: string; label: string; value: string }[] {
    if (!this.property) return [];
    const p = this.property;
    return [
      { icon: 'fa-solid fa-vector-square', label: 'Area', value: `${p.area} m²` },
      { icon: 'fa-solid fa-bed', label: 'Bedrooms', value: p.bedrooms > 0 ? `${p.bedrooms}` : 'N/A' },
      { icon: 'fa-solid fa-bath', label: 'Bathrooms', value: p.bathrooms > 0 ? `${p.bathrooms}` : 'N/A' },
      { icon: 'fa-solid fa-layer-group', label: 'Floor', value: p.floor > 0 ? `${p.floor} / ${p.totalFloors}` : 'N/A' },
      { icon: 'fa-solid fa-calendar', label: 'Year Built', value: p.yearBuilt > 0 ? `${p.yearBuilt}` : 'N/A' },
      { icon: 'fa-solid fa-car', label: 'Parking', value: p.parkingSpots > 0 ? `${p.parkingSpots} spot(s)` : 'None' },
      { icon: 'fa-solid fa-tag', label: 'Type', value: p.propertyType },
      { icon: 'fa-solid fa-circle-check', label: 'Status', value: p.status }
    ];
  }
}