import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, take } from 'rxjs/operators';

// Apply this guard to every protected route in app.routes.ts.
// It is the hard wall — even if someone bypasses the button
// by typing a URL directly, they cannot get through.
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user)               return router.createUrlTree(['/auth/login']);
      if (!user.emailVerified) return router.createUrlTree(['/auth/register']);
      return true;
    })
  );
};