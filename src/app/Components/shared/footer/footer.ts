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

  // Only accounts that actually exist belong here — Facebook and YouTube
  // used to sit alongside these pointing at the bare platform homepages,
  // which sent visitors to instagram.com/facebook.com rather than a profile
  // and read as broken. `external` is false for the mailto so it opens the
  // mail client in place instead of leaving an empty tab behind.
  socials = [
    {
      label: 'Instagram',
      icon: 'fa-brands fa-instagram',
      url: 'https://www.instagram.com/nikoloz_bocho/',
      external: true,
    },
    {
      label: 'TikTok',
      icon: 'fa-brands fa-tiktok',
      url: 'https://www.tiktok.com/@nikukin29',
      external: true,
    },
    {
      label: 'LinkedIn',
      icon: 'fa-brands fa-linkedin-in',
      url: 'https://www.linkedin.com/in/nikoloz-bochorishvili-75a236374/',
      external: true,
    },
    {
      label: 'Email',
      icon: 'fa-solid fa-envelope',
      url: 'mailto:bochoranika581@gmail.com',
      external: false,
    },
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
    {
      icon: 'fa-solid fa-envelope',
      label: 'bochoranika581@gmail.com',
      href: 'mailto:bochoranika581@gmail.com',
    },
    { icon: 'fa-solid fa-clock', label: 'Mon – Sat, 9:00 – 18:00', href: null },
  ];

  bottomLinks = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ];
}