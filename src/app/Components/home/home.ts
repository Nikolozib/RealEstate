import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PropertyService } from '../../core/services/property';
import { Property } from '../../core/services/models/property.model';
import { SeoService } from '../../core/services/seo';
import * as AOS from 'aos';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit, OnDestroy {
  featuredProperties: Property[] = [];
  loading = true;

  currentSlide = 0;
  private slideInterval: any;

  slides = [
    {
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80',
      label: 'Premium Villas',
      headline: 'Find Your Perfect\nHome in Georgia',
      sub: 'Browse premium apartments, houses and villas across Tbilisi and beyond.'
    },
    {
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=80',
      label: 'Modern Apartments',
      headline: 'Live Where\nTbilisi Shines',
      sub: 'Discover handpicked properties in the most sought-after districts of the city.'
    },
    {
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80',
      label: 'Luxury Living',
      headline: 'Invest in\nGeorgian Real Estate',
      sub: 'From cozy studios to grand family homes — your next chapter starts here.'
    }
  ];

  reviews = [
    {
      text: 'We found our dream apartment in Vake through this platform. The process was smooth and the listings were accurate and up to date.',
      name: 'Giorgi Beridze',
      city: 'Tbilisi',
      avatar: 'https://i.pravatar.cc/60?img=11'
    },
    {
      text: 'I was relocating from abroad and needed a reliable source for Georgian real estate. This site made everything easy and transparent.',
      name: 'Anna Kowalski',
      city: 'Warsaw → Tbilisi',
      avatar: 'https://i.pravatar.cc/60?img=5'
    },
    {
      text: 'Found a great commercial space in Didube within a week. The filters made it simple to narrow down exactly what I needed.',
      name: 'Levan Kvaratskhelia',
      city: 'Tbilisi',
      avatar: 'https://i.pravatar.cc/60?img=15'
    }
  ];

  stats = [
    { value: '500+', label: 'Properties Listed' },
    { value: '1,200+', label: 'Happy Clients' },
    { value: '12', label: 'Cities Covered' },
    { value: '8', label: 'Years Experience' }
  ];

  constructor(
    private propertyService: PropertyService,
    private seo: SeoService
  ) {}

  ngOnInit() {
    this.seo.setPageMeta(
      'RealEstate Georgia — Find Your Home',
      'Browse premium apartments, houses and villas for sale and rent across Tbilisi and Georgia.'
    );

    this.propertyService.getFeaturedProperties().subscribe(props => {
      this.featuredProperties = props;
      this.loading = false;
    });

    this.startSlider();
    AOS.init({ duration: 800, easing: 'ease-in-out', once: true, offset: 60 });
  }

  ngOnDestroy() {
    this.stopSlider();
  }

  startSlider() {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  stopSlider() {
    if (this.slideInterval) clearInterval(this.slideInterval);
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    this.stopSlider();
    this.startSlider();
  }

  formatPrice(price: number, type: string): string {
    if (type === 'rent') return `$${price.toLocaleString()}/mo`;
    return `$${price.toLocaleString()}`;
  }
}