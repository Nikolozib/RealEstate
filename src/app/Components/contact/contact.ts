import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InquiryService } from '../../core/services/inquiry';
import { N8nService } from '../../core/services/n8n';
import { SeoService } from '../../core/services/seo';
import { ToastService } from '../../core/services/toast';
import {
  emailValidator,
  messageValidator,
  nameValidator,
  phoneValidator,
} from '../../core/utils/form-validators';
import { initAos } from '../../core/utils/aos';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements OnInit {
  private fb = inject(FormBuilder);

  sending = false;
  sent = false;
  error = '';

  @ViewChild('successBox') successBox?: ElementRef<HTMLElement>;

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  contactForm = this.fb.group({
    name: ['', [Validators.required, nameValidator()]],
    email: ['', [Validators.required, emailValidator()]],
    phone: ['', [phoneValidator(false)]],
    subject: [''],
    message: ['', [Validators.required, messageValidator(10)]],
  });

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
      value: 'bochoranika581@gmail.com',
      href: 'mailto:bochoranika581@gmail.com',
    },
    { icon: 'fa-solid fa-clock', label: 'Working Hours', value: 'Mon – Sat, 9:00 – 18:00' },
  ];

  constructor(
    private inquiryService: InquiryService,
    private n8n: N8nService,
    private seo: SeoService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.seo.setPageMeta(
      'Contact Us | RealEstate Georgia',
      'Get in touch with our team. We are here to help you find your perfect property in Georgia.',
    );
    this.seo.setCanonicalUrl('/contact');
    if (this.isBrowser) initAos({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });
  }

  async send() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.error = this.getFormErrorMessage();
      this.cdr.detectChanges();
      return;
    }

    const { name, email, phone, subject, message } = this.contactForm.getRawValue();

    this.sending = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      await this.inquiryService.sendInquiry({
        propertyId: '',
        propertyTitle: subject || 'General Inquiry',
        senderName: name!,
        senderEmail: email!,
        senderPhone: phone ?? '',
        message: message!,
        userId: null,
        agentId: '',
      });
      // Fire-and-forget: the lead is already saved in Firestore, this only
      // emails the owner via n8n. A webhook hiccup must not fail the UX.
      this.n8n
        .sendLead({
          type: 'contact',
          name: name!,
          email: email!,
          phone: phone ?? '',
          subject: subject ?? '',
          message: message!,
          propertyId: '',
          propertyTitle: '',
          propertyUrl: '',
        })
        .catch(err => console.warn('Lead webhook failed:', err));

      this.sent = true;
      this.toast.success('Message sent! We\'ll get back to you soon.');
      this.contactForm.reset();
      // The success box replaces the form in place; if the user scrolled down
      // to reach the submit button, it renders above the fold. detectChanges()
      // forces Angular to paint it synchronously (this app is zoneless, so
      // nothing does that automatically), so the ViewChild is already
      // resolved by the time we scroll to it.
      this.cdr.detectChanges();
      this.successBox?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      this.error = 'Something went wrong. Please try again.';
      this.toast.error(this.error);
    } finally {
      this.sending = false;
      // Zoneless app: awaiting a Firestore call isn't tracked by Angular's
      // change-detection scheduler, so without this the UI would only
      // refresh once some unrelated event happened to trigger a tick.
      this.cdr.detectChanges();
    }
  }

  private getFormErrorMessage(): string {
    const { name, email, phone, message } = this.contactForm.controls;
    if (name.hasError('required') || email.hasError('required') || message.hasError('required')) {
      return 'Please fill in all required fields.';
    }
    if (name.hasError('invalidName')) {
      return 'Please enter a valid name (letters only, at least 2 characters).';
    }
    if (email.hasError('invalidEmail')) {
      return 'Please enter a valid email address.';
    }
    if (phone.hasError('invalidPhone')) {
      return 'Please enter a valid phone number (digits only, 7–15 digits).';
    }
    if (message.hasError('invalidMessage')) {
      return 'Message must be at least 10 characters.';
    }
    return 'Please check the form and try again.';
  }
}
