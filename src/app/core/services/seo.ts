import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
 
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
 
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
  }
 
  setPageMeta(title: string, description: string): void {
    this.setTitle(title);
    this.setMetaTags({ description, ogTitle: title, ogDescription: description });
  }
}