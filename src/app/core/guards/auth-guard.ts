import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { switchMap, take } from 'rxjs/operators';

// Apply this guard to every protected route in app.routes.ts.
// It is the hard wall — even if someone bypasses the button
// by typing a URL directly, they cannot get through.
//
// reloadCurrentUser() forces a fresh lookup against Firebase's servers
// before we trust emailVerified, instead of the value cached locally at
// sign-in — that cached value lives in IndexedDB/localStorage and can be
// edited via DevTools, so trusting it without a refresh would let a
// tampered flag through until the SDK's next automatic token refresh.
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    switchMap(user => {
      if (!user) return Promise.resolve(router.createUrlTree(['/auth/login']));
      return authService.reloadCurrentUser().then(() => {
        const freshUser = authService.getCurrentUser();
        if (!freshUser)               return router.createUrlTree(['/auth/login']);
        if (!freshUser.emailVerified) return router.createUrlTree(['/auth/register']);
        return true;
      });
    })
  );
};