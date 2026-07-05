import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InquiryService } from '../../core/services/inquiry';
import { SeoService } from '../../core/services/seo';
import {
  isValidEmail,
  isValidMessage,
  isValidName,
  isValidPhone,
} from '../../core/utils/validation';
import * as AOS from 'aos';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements OnInit {
  name = '';
  email = '';
  phone = '';
  subject = '';
  message = '';
  sending = false;
  sent = false;
  error = '';

  @ViewChild('successBox') successBox?: ElementRef<HTMLElement>;

  contactInfo = [
    {
      icon: 'fa-solid fa-location-dot',
      label: 'Address',
      value: 'Rustaveli Avenue 12, Tbilisi, Georgia',
    },
    {
      icon: 'fa-solid fa-phone',
      label: 'Phone',
      value: '+995 555 000 000',
      href: 'tel:+995555000000',
    },
    {
      icon: 'fa-solid fa-envelope',
      label: 'Email',
      value: 'info@realestate.ge',
      href: 'mailto:info@realestate.ge',
    },
    { icon: 'fa-solid fa-clock', label: 'Working Hours', value: 'Mon – Sat, 9:00 – 18:00' },
  ];

  constructor(
    private inquiryService: InquiryService,
    private seo: SeoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.seo.setPageMeta(
      'Contact Us | RealEstate Georgia',
      'Get in touch with our team. We are here to help you find your perfect property in Georgia.',
    );
    AOS.init({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });
  }

  async send() {
    if (!this.name || !this.email || !this.message) {
      this.error = 'Please fill in all required fields.';
      this.cdr.detectChanges();
      return;
    }

    if (!isValidName(this.name)) {
      this.error = 'Please enter a valid name (letters only, at least 2 characters).';
      this.cdr.detectChanges();
      return;
    }

    if (!isValidEmail(this.email)) {
      this.error = 'Please enter a valid email address.';
      this.cdr.detectChanges();
      return;
    }

    if (this.phone.trim() && !isValidPhone(this.phone)) {
      this.error = 'Please enter a valid phone number (digits only, 7–15 digits).';
      this.cdr.detectChanges();
      return;
    }

    if (!isValidMessage(this.message)) {
      this.error = 'Message must be at least 10 characters.';
      this.cdr.detectChanges();
      return;
    }

    this.sending = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      await this.inquiryService.sendInquiry({
        propertyId: '',
        propertyTitle: this.subject || 'General Inquiry',
        senderName: this.name,
        senderEmail: this.email,
        senderPhone: this.phone,
        message: this.message,
        userId: null,
        agentId: '',
      });
      this.sent = true;
      this.name = '';
      this.email = '';
      this.phone = '';
      this.subject = '';
      this.message = '';
      // The success box replaces the form in place; if the user scrolled down
      // to reach the submit button, it renders above the fold. detectChanges()
      // forces Angular to paint it synchronously (this app is zoneless, so
      // nothing does that automatically), so the ViewChild is already
      // resolved by the time we scroll to it.
      this.cdr.detectChanges();
      this.successBox?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      this.error = 'Something went wrong. Please try again.';
    } finally {
      this.sending = false;
      // Zoneless app: awaiting a Firestore call isn't tracked by Angular's
      // change-detection scheduler, so without this the UI would only
      // refresh once some unrelated event happened to trigger a tick.
      this.cdr.detectChanges();
    }
  }
}
