import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {
  currentYear = new Date().getFullYear();

  socials = [
    { label: 'Facebook', icon: 'fa-brands fa-facebook-f', url: 'https://facebook.com' },
    { label: 'Instagram', icon: 'fa-brands fa-instagram', url: 'https://instagram.com' },
    { label: 'TikTok', icon: 'fa-brands fa-tiktok', url: 'https://tiktok.com' },
    { label: 'YouTube', icon: 'fa-brands fa-youtube', url: 'https://youtube.com' },
    { label: 'LinkedIn', icon: 'fa-brands fa-linkedin-in', url: 'https://linkedin.com' },
  ];

  propertyLinks = [
    { label: 'Apartments', type: 'apartment' },
    { label: 'Houses', type: 'house' },
    { label: 'Villas', type: 'villa' },
    { label: 'Commercial', type: 'commercial' },
    { label: 'Land Plots', type: 'land' },
  ];

  companyLinks = [
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' },
    { label: 'All Listings', path: '/listings' },
    { label: 'Saved Properties', path: '/favorites' },
  ];

  contactInfo = [
    { icon: 'fa-solid fa-location-dot', label: 'Rustaveli Avenue 12, Tbilisi', href: null },
    { icon: 'fa-solid fa-phone', label: '+995 555 000 000', href: 'tel:+995555000000' },
    { icon: 'fa-solid fa-envelope', label: 'info@realestate.ge', href: 'mailto:info@realestate.ge' },
    { icon: 'fa-solid fa-clock', label: 'Mon – Sat, 9:00 – 18:00', href: null },
  ];

  bottomLinks = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ];
}