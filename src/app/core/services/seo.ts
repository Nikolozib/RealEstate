import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../environment/environment';
import { Property } from './models/property.model';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  setTitle(title: string): void {
    this.title.setTitle(title);
  }

  setMetaTags(tags: {
    description?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
  }): void {
    if (tags.description) this.meta.updateTag({ name: 'description', content: tags.description });
    if (tags.keywords) this.meta.updateTag({ name: 'keywords', content: tags.keywords });
    if (tags.ogTitle) this.meta.updateTag({ property: 'og:title', content: tags.ogTitle });
    if (tags.ogDescription) this.meta.updateTag({ property: 'og:description', content: tags.ogDescription });
    if (tags.ogImage) this.meta.updateTag({ property: 'og:image', content: tags.ogImage });
    if (tags.ogUrl) this.meta.updateTag({ property: 'og:url', content: tags.ogUrl });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
  }

  setPageMeta(title: string, description: string): void {
    this.setTitle(title);
    this.setMetaTags({ description, ogTitle: title, ogDescription: description });
  }

  // Points crawlers to the canonical (query-param-free) URL for the current
  // route, so filtered/sorted listing URLs don't get indexed as duplicates.
  setCanonicalUrl(path: string): void {
    const href = `${environment.siteUrl}${path}`;
    let link = this.document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
    this.meta.updateTag({ property: 'og:url', content: href });
  }

  // Injects (or replaces) a single <script type="application/ld+json"> tag
  // identified by `id`, so repeated navigation to the same route type
  // doesn't pile up duplicate structured-data blocks.
  setJsonLd(id: string, data: Record<string, unknown>): void {
    let script = this.document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.text = JSON.stringify(data);
  }

  removeJsonLd(id: string): void {
    this.document.getElementById(id)?.remove();
  }

  setOrganizationData(): void {
    this.setJsonLd('ld-organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'RealEstate Georgia',
      url: environment.siteUrl,
      logo: `${environment.siteUrl}/favicon.ico`,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+995-555-000-000',
        contactType: 'customer service',
        areaServed: 'GE',
      },
    });
  }

  setPropertyStructuredData(property: Property, id: string): void {
    this.setJsonLd('ld-product', {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: property.title,
      description: property.description,
      image: [property.thumbnailUrl, ...(property.images || [])].filter(Boolean),
      offers: {
        '@type': 'Offer',
        price: property.price,
        priceCurrency: 'USD',
        availability:
          property.status === 'available'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/SoldOut',
        url: `${environment.siteUrl}/listings/${id}`,
      },
      address: {
        '@type': 'PostalAddress',
        streetAddress: property.address,
        addressLocality: property.city,
        addressRegion: property.district,
        addressCountry: 'GE',
      },
    });
  }

  setBreadcrumbs(items: { name: string; path: string }[]): void {
    this.setJsonLd('ld-breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${environment.siteUrl}${item.path}`,
      })),
    });
  }
}
