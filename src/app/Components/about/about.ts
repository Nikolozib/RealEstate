import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo';
import * as AOS from 'aos';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about.html',
  styleUrl: './about.scss'
})
export class About implements OnInit {
  stats = [
    { value: '500+', label: 'Properties Listed', icon: 'fa-solid fa-building' },
    { value: '1,200+', label: 'Happy Clients', icon: 'fa-solid fa-users' },
    { value: '12', label: 'Cities Covered', icon: 'fa-solid fa-map-location-dot' },
    { value: '8', label: 'Years Experience', icon: 'fa-solid fa-calendar-check' }
  ];

  team = [
    {
      name: 'Nino Beridze',
      role: 'Founder & CEO',
      bio: 'With 12 years in Georgian real estate, Nino built this platform to make property search transparent and accessible.',
      avatar: 'https://i.pravatar.cc/200?img=47'
    },
    {
      name: 'Giorgi Kvaratskhelia',
      role: 'Head of Sales',
      bio: 'Giorgi specializes in residential and commercial properties across Tbilisi with over 300 successful deals.',
      avatar: 'https://i.pravatar.cc/200?img=11'
    },
    {
      name: 'Ana Lordkipanidze',
      role: 'Senior Agent',
      bio: 'Ana focuses on luxury villas and investment properties, helping clients find the best ROI opportunities.',
      avatar: 'https://i.pravatar.cc/200?img=5'
    }
  ];

  values = [
    { icon: 'fa-solid fa-handshake', title: 'Trust', desc: 'Every listing is verified by our team before going live. No fake listings, no hidden fees.' },
    { icon: 'fa-solid fa-eye', title: 'Transparency', desc: 'We provide full property details, real photos and honest pricing — what you see is what you get.' },
    { icon: 'fa-solid fa-bolt', title: 'Speed', desc: 'From first inquiry to closing the deal, we move fast and keep you informed every step of the way.' },
    { icon: 'fa-solid fa-heart', title: 'Care', desc: 'We treat every client as family. Your dream home matters to us just as much as it matters to you.' }
  ];

  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.setPageMeta(
      'About Us | RealEstate Georgia',
      'Learn about our team, mission and values. We are Georgia\'s most trusted real estate platform.'
    );
    AOS.init({ duration: 800, easing: 'ease-in-out', once: true, offset: 60 });
  }
}