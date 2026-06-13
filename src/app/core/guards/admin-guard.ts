import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { UserService } from '../services/user';
import { map, take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  return auth.isLoggedIn$.pipe(
    take(1),
    switchMap(isLoggedIn => {
      if (!isLoggedIn) return of(router.createUrlTree(['/auth/login']));
      const user = auth.getCurrentUser();
      if (!user) return of(router.createUrlTree(['/auth/login']));
      return userService.getUserById(user.uid).pipe(
        take(1),
        map(userData => {
          if (userData?.role === 'admin' || userData?.role === 'agent') return true;
          return router.createUrlTree(['/']);
        })
      );
    })
  );
};