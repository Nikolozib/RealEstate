import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  linkWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  user,
  User as FirebaseUser,
} from '@angular/fire/auth';
import { map, shareReplay } from 'rxjs/operators';

// The single definition of "verified": a confirmed email link OR a linked
// phone number (Firebase only links a phone after its SMS code is confirmed,
// so a non-null phoneNumber is itself proof of ownership).
export function isUserVerified(u: FirebaseUser | null): boolean {
  return !!u && (u.emailVerified || !!u.phoneNumber);
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);

  readonly currentUser$ = user(this.auth).pipe(shareReplay(1));
  readonly isLoggedIn$ = this.currentUser$.pipe(map(u => !!u));
  // True only once the account is verified (email link or SMS) — this is
  // what UI should gate on, since Firebase signs a user in immediately after
  // registration, before they've verified anything.
  readonly isVerified$ = this.currentUser$.pipe(map(isUserVerified));

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

  sendPasswordReset(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  // Firebase web phone auth always requires a reCAPTCHA check; 'invisible'
  // keeps it out of sight unless Google demands a challenge. The container
  // element must exist in the DOM when this is called.
  createRecaptcha(containerId: string): RecaptchaVerifier {
    return new RecaptchaVerifier(this.auth, containerId, { size: 'invisible' });
  }

  // Starts SMS verification for the signed-in user. Linking (rather than
  // signing in with the phone) keeps the email/password credentials and adds
  // the verified phone to the same account.
  linkPhoneNumber(
    firebaseUser: FirebaseUser,
    phone: string,
    verifier: RecaptchaVerifier,
  ): Promise<ConfirmationResult> {
    return linkWithPhoneNumber(firebaseUser, phone, verifier);
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