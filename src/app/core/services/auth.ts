import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  user,
  User as FirebaseUser,
} from '@angular/fire/auth';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);

  readonly currentUser$ = user(this.auth).pipe(shareReplay(1));
  readonly isLoggedIn$ = this.currentUser$.pipe(map(u => !!u));
  // True only once the email is verified — this is what UI should gate on,
  // since Firebase signs a user in immediately after registration, before
  // they've verified anything.
  readonly isVerified$ = this.currentUser$.pipe(map(u => !!u && u.emailVerified));

  register(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth);
  }

  getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  // Fetches a fresh token from Firebase so emailVerified is up-to-date.
  // Must be called before reading currentUser.emailVerified.
  reloadCurrentUser(): Promise<void> {
    const u = this.auth.currentUser;
    return u ? u.reload() : Promise.resolve();
  }

  sendVerificationEmail(firebaseUser: FirebaseUser): Promise<void> {
    return sendEmailVerification(firebaseUser);
  }

  // updatePassword requires a "recent" login — reauthenticating with the
  // current password first guarantees that regardless of session age, and
  // doubles as proof the caller actually knows the current password.
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('No authenticated user.');
    }
    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
    await reauthenticateWithCredential(firebaseUser, credential);
    await updatePassword(firebaseUser, newPassword);
  }
}