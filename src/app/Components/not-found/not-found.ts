import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss'
})
export class NotFound {
  constructor(seo: SeoService) {
    seo.setPageMeta(
      'Page Not Found | RealEstate Georgia',
      'The page you are looking for does not exist.'
    );
  }
}
