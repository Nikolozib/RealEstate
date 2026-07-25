import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
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

  // Google accounts arrive with emailVerified already true, so this path
  // deliberately skips the n8n link/code verification flow — Google has
  // already proven the address belongs to the person signing in.
  //
  // Popup rather than redirect: the site is served from a different origin
  // than the Firebase authDomain, and browser storage partitioning breaks
  // signInWithRedirect in that setup.
  signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    // Force the account chooser — otherwise a browser signed into exactly
    // one Google account reuses it silently, which is surprising on a
    // shared machine.
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(this.auth, provider);
  }

  logout() {
    return signOut(this.auth);
  }

  getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  // Fetches a fresh account record from Firebase so emailVerified is
  // up-to-date. Must be called before reading currentUser.emailVerified.
  async reloadCurrentUser(): Promise<void> {
    const u = this.auth.currentUser;
    if (!u) return;
    const wasVerified = u.emailVerified;
    await u.reload();
    // reload() mutates the user object in place without notifying auth-state
    // subscribers, so currentUser$ consumers (header, chatbot) would keep the
    // stale unverified snapshot until the hourly token refresh. When reload
    // reveals the verification flip, force a refresh so the stream re-emits
    // now — and the new ID token carries the email_verified claim too.
    if (!wasVerified && u.emailVerified) {
      await u.getIdToken(true);
    }
  }

  sendVerificationEmail(firebaseUser: FirebaseUser): Promise<void> {
    return sendEmailVerification(firebaseUser);
  }

  sendPasswordReset(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
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