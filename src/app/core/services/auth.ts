import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  user
} from '@angular/fire/auth';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);

  // user() from AngularFire waits for Firebase to resolve auth state before emitting.
  // BehaviorSubject(null) emitted null immediately — causing take(1) to capture null
  // and redirect to login before Firebase had a chance to confirm the user was logged in.
  readonly currentUser$ = user(this.auth).pipe(shareReplay(1));
  readonly isLoggedIn$ = this.currentUser$.pipe(map(u => !!u));

  register(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth);
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }
}