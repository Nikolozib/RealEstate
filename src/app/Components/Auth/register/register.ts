import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';
import { N8nService } from '../../../core/services/n8n';
import { SeoService } from '../../../core/services/seo';
import {
  emailValidator,
  nameValidator,
  passwordValidator,
  passwordsMatchValidator,
  phoneValidator,
} from '../../../core/utils/form-validators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);

  loading = false;
  error = '';
  showPassword = false;
  showConfirm = false;

  registrationComplete = false;
  registeredEmail = '';
  profileWarning = '';
  resendLoading = false;
  resendSuccess = false;
  resendError = '';

  private pollInterval: any = null;

  @ViewChild('verifyCard') verifyCard?: ElementRef<HTMLElement>;

  registerForm = this.fb.group(
    {
      displayName: ['', [Validators.required, nameValidator()]],
      email: ['', [Validators.required, emailValidator()]],
      phone: ['', [phoneValidator(false)]],
      password: ['', [Validators.required, passwordValidator(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator('password', 'confirmPassword') },
  );

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private n8n: N8nService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    seo: SeoService,
  ) {
    seo.setPageMeta(
      'Create Account | RealEstate Georgia',
      'Register to save properties and contact agents on RealEstate Georgia.'
    );
    seo.setCanonicalUrl('/auth/register');
  }

  // If an earlier signup was interrupted (refresh, back navigation, a detour
  // through the login page) the unverified Firebase session usually still
  // exists — resume the "check your inbox" screen instead of showing a form
  // that can only fail with "email already in use".
  ngOnInit() {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (user && !user.emailVerified && !this.registrationComplete) {
        this.registeredEmail = user.email ?? '';
        this.registrationComplete = true;
        this.cdr.detectChanges();
        this.startPolling();
      }
    });
  }

  get passwordsMismatch(): boolean {
    const confirm = this.registerForm.controls.confirmPassword;
    return !!confirm.value && this.registerForm.hasError('passwordMismatch');
  }

  async register() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.error = this.getFormErrorMessage();
      this.cdr.detectChanges();
      return;
    }

    const { displayName, email, phone, password } = this.registerForm.getRawValue();

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      const cred = await this.authService.register(email!, password!);

      try {
        await this.userService.createUser(cred.user.uid, {
          displayName: displayName!,
          email: email!,
          phone: phone ?? '',
          photoURL: '',
        });
      } catch (firestoreError) {
        console.warn('Firestore user creation failed:', firestoreError);
        this.profileWarning =
          'Profile details could not be saved. You can complete them from Settings.';
      }

      await this.authService.sendVerificationEmail(cred.user);

      // Fire-and-forget owner notification — signup must succeed even if
      // the alert webhook is down.
      this.n8n
        .sendAdminAlert('user_registered', `${displayName} <${email}> just created an account.`)
        .catch(err => console.warn('Admin alert webhook failed:', err));

      this.registeredEmail = email!;
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

  private getFormErrorMessage(): string {
    const { displayName, email, phone, password, confirmPassword } = this.registerForm.controls;
    if (
      displayName.hasError('required') ||
      email.hasError('required') ||
      password.hasError('required') ||
      confirmPassword.hasError('required')
    ) {
      return 'Please fill in all required fields.';
    }
    if (displayName.hasError('invalidName')) {
      return 'Please enter a valid name (letters only, at least 2 characters).';
    }
    if (email.hasError('invalidEmail')) {
      return 'Please enter a valid email address.';
    }
    if (phone.hasError('invalidPhone')) {
      return 'Please enter a valid phone number (digits only, 7–15 digits).';
    }
    if (password.hasError('invalidPassword')) {
      return 'Password must be at least 6 characters.';
    }
    if (this.registerForm.hasError('passwordMismatch')) {
      return 'Passwords do not match.';
    }
    return 'Please check the form and try again.';
  }

  // Firebase never lets you "re-register" an email, even if the original
  // signup was abandoned before verification — that would otherwise strand
  // the email forever. If these credentials belong to that same unverified
  // account, sign in, resend the link, and drop them back on the waiting
  // screen instead of a dead-end error.
  private async resumeIfUnverified() {
    const { email, password } = this.registerForm.getRawValue();
    let cred;
    try {
      cred = await this.authService.login(email!, password!);
    } catch {
      this.error =
        'An account with this email already exists but this password doesn\'t match it. ' +
        'Use the password from your first signup, reset it from the sign-in page, or use a different email.';
      return;
    }

    if (cred.user.emailVerified) {
      await this.authService.logout();
      this.error = 'An account with this email already exists and is verified. Please sign in instead.';
      return;
    }

    // Resend is best-effort: Firebase throttles verification emails hard
    // (auth/too-many-requests), one was already sent by the original signup,
    // and landing back on the waiting screen matters more than the resend.
    try {
      await this.authService.sendVerificationEmail(cred.user);
    } catch (e) {
      console.warn('Verification resend failed:', e);
    }
    this.registeredEmail = email!;
    this.registrationComplete = true;
    this.scrollToVerifyCard();
    this.startPolling();
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
    this.resendError = '';

    try {
      await this.authService.sendVerificationEmail(user);
      this.resendSuccess = true;
      setTimeout(() => {
        this.resendSuccess = false;
        this.cdr.detectChanges();
      }, 4000);
    } catch (e: any) {
      console.warn('Resend failed:', e);
      this.resendError =
        e?.code === 'auth/too-many-requests'
          ? 'Firebase is rate-limiting resends. The earlier email is still valid — check your spam folder, or wait a few minutes and try again.'
          : 'Could not resend the email right now. Please try again in a moment.';
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
    const p = this.registerForm.controls.password.value ?? '';
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
