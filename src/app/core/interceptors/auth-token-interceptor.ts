import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, switchMap } from 'rxjs';
import { SKIP_AUTH_TOKEN } from './http-context';

// Attaches the current Firebase ID token to outgoing HttpClient requests
// (e.g. calls to Cloud Functions or another first-party API). Firestore/Auth
// calls made through @angular/fire bypass HttpClient entirely and already
// carry their own credentials, so this only matters for non-Firebase HTTP.
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const user = auth.currentUser;

  if (!user || req.context.get(SKIP_AUTH_TOKEN)) return next(req);

  return from(user.getIdToken()).pipe(
    switchMap(token =>
      next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
    )
  );
};
