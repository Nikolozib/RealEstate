import { ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';
import {
  isValidEmail,
  isValidName,
  isValidPassword,
  isValidPhone,
} from '../../../core/utils/validation';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnDestroy {
  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';
  loading = false;
  error = '';
  showPassword = false;
  showConfirm = false;

  registrationComplete = false;
  registeredEmail = '';
  profileWarning = '';
  resendLoading = false;
  resendSuccess = false;

  private pollInterval: any = null;

  @ViewChild('verifyCard') verifyCard?: ElementRef<HTMLElement>;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  async register() {
    if (!this.displayName || !this.email || !this.password || !this.confirmPassword) {
      this.error = 'Please fill in all required fields.';
      this.cdr.detectChanges();
      return;
    }
    if (!isValidName(this.displayName)) {
      this.error = 'Please enter a valid name (letters only, at least 2 characters).';
      this.cdr.detectChanges();
      return;
    }
    if (!isValidEmail(this.email)) {
      this.error = 'Please enter a valid email address.';
      this.cdr.detectChanges();
      return;
    }
    if (this.phone.trim() && !isValidPhone(this.phone)) {
      this.error = 'Please enter a valid phone number (digits only, 7–15 digits).';
      this.cdr.detectChanges();
      return;
    }
    if (!isValidPassword(this.password)) {
      this.error = 'Password must be at least 6 characters.';
      this.cdr.detectChanges();
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      const cred = await this.authService.register(this.email, this.password);

      try {
        await this.userService.createUser(cred.user.uid, {
          displayName: this.displayName,
          email: this.email,
          phone: this.phone,
          photoURL: '',
        });
      } catch (firestoreError) {
        console.warn('Firestore user creation failed:', firestoreError);
        this.profileWarning =
          'Profile details could not be saved. You can complete them from Settings.';
      }

      await this.authService.sendVerificationEmail(cred.user);

      this.registeredEmail = this.email;
      this.registrationComplete = true;
      this.scrollToVerifyCard();

      // Poll Firebase every 3 seconds — when the user clicks the link
      // in their email, emailVerified flips to true and we redirect automatically.
      // No button means nothing to bypass.
      this.startPolling();

    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        await this.resumeIfUnverified();
      } else {
        this.error = this.getErrorMessage(e.code);
      }
    } finally {
      this.loading = false;
      // This app runs zoneless: awaiting a Firebase call isn't tracked by
      // Angular's change-detection scheduler, so without this the UI would
      // only refresh once some unrelated event (a scroll, a click) happened
      // to trigger a tick elsewhere.
      this.cdr.detectChanges();
    }
  }

  // Firebase never lets you "re-register" an email, even if the original
  // signup was abandoned before verification — that would otherwise strand
  // the email forever. If these credentials belong to that same unverified
  // account, sign in, resend the link, and drop them back on the waiting
  // screen instead of a dead-end error.
  private async resumeIfUnverified() {
    try {
      const cred = await this.authService.login(this.email, this.password);

      if (cred.user.emailVerified) {
        await this.authService.logout();
        this.error = 'An account with this email already exists and is verified. Please sign in instead.';
        return;
      }

      await this.authService.sendVerificationEmail(cred.user);
      this.registeredEmail = this.email;
      this.registrationComplete = true;
      this.scrollToVerifyCard();
      this.startPolling();
    } catch {
      this.error = 'An account with this email already exists. If it\'s yours, sign in instead — or use a different email.';
    }
  }

  // The "check your inbox" card replaces the registration form in place; if
  // the user scrolled down to reach the submit button, it renders above the
  // fold. detectChanges() forces Angular to paint it synchronously (this app
  // is zoneless, so nothing does that automatically), so the ViewChild is
  // already resolved by the time we scroll to it.
  private scrollToVerifyCard() {
    this.cdr.detectChanges();
    this.verifyCard?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private startPolling() {
    this.pollInterval = setInterval(async () => {
      try {
        await this.authService.reloadCurrentUser();
        const user = this.authService.getCurrentUser();
        if (user?.emailVerified) {
          this.stopPolling();
          this.router.navigate(['/']);
        }
      } catch (e) {
        console.warn('Verification poll error:', e);
      }
    }, 3000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Stop polling if the user navigates away
  ngOnDestroy() {
    this.stopPolling();
  }

  async resendVerification() {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.resendLoading = true;
    this.resendSuccess = false;

    try {
      await this.authService.sendVerificationEmail(user);
      this.resendSuccess = true;
      setTimeout(() => {
        this.resendSuccess = false;
        this.cdr.detectChanges();
      }, 4000);
    } catch (e) {
      console.warn('Resend failed:', e);
    } finally {
      this.resendLoading = false;
      this.cdr.detectChanges();
    }
  }

  getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email':        return 'Please enter a valid email address.';
      case 'auth/weak-password':        return 'Password should be at least 6 characters.';
      default:                          return 'Something went wrong. Please try again.';
    }
  }

  getPasswordStrength(): { label: string; level: number } {
    const p = this.password;
    if (!p) return { label: '', level: 0 };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak', level: 1 };
    if (score <= 3) return { label: 'Fair', level: 2 };
    return { label: 'Strong', level: 3 };
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirm()  { this.showConfirm  = !this.showConfirm;  }
}