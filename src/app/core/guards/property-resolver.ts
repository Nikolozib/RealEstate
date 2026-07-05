import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
import { PropertyService } from '../services/property';
import { Property } from '../services/models/property.model';

// Resolves the property before the route activates so the component never
// has to render its own "loading" state for the primary content — that also
// means the data (and the SEO title/meta set from it) is present in the
// very first render pass under SSR, instead of arriving after hydration.
export const propertyResolver: ResolveFn<Property | null> = (route): Observable<Property | null> => {
  const propertyService = inject(PropertyService);
  const id = route.paramMap.get('id');
  if (!id) return of(null);

  return propertyService.getPropertyById(id).pipe(
    take(1),
    catchError(() => of(null))
  );
};
