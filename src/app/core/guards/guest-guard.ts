import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth';

// Keeps already-verified users off /auth/login and /auth/register —
// bookmarking or navigating back to those pages while signed in should
// land them back home instead of showing a form they don't need.
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isVerified$.pipe(
    take(1),
    map(isVerified => (isVerified ? router.createUrlTree(['/']) : true))
  );
};
