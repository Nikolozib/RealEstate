import { Component, OnInit } from '@angular/core';
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
      return;
    }

    if (!isValidName(this.name)) {
      this.error = 'Please enter a valid name (letters only, at least 2 characters).';
      return;
    }

    if (!isValidEmail(this.email)) {
      this.error = 'Please enter a valid email address.';
      return;
    }

    if (this.phone.trim() && !isValidPhone(this.phone)) {
      this.error = 'Please enter a valid phone number (digits only, 7–15 digits).';
      return;
    }

    if (!isValidMessage(this.message)) {
      this.error = 'Message must be at least 10 characters.';
      return;
    }

    this.sending = true;
    this.error = '';

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
    } catch (e) {
      this.error = 'Something went wrong. Please try again.';
    } finally {
      this.sending = false;
    }
  }
}
