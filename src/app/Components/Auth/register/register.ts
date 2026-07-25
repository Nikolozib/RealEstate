import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { googleAuthErrorMessage } from '../../../core/utils/auth-errors';
import { GoogleIcon } from '../../shared/google-icon/google-icon';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, GoogleIcon],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);

  loading = false;
  googleLoading = false;
  error = '';
  showPassword = false;
  showConfirm = false;

  registrationComplete = false;
  registeredEmail = '';
  profileWarning = '';
  resendLoading = false;
  resendSuccess = false;
  resendError = '';

  // Typed-code alternative to clicking the emailed link. The same email
  // carries both; whichever the user completes first wins.
  codeControl = new FormControl('', { nonNullable: true });
  codeLoading = false;
  codeError = '';

  private registeredName = '';
  private verifiedAlertSent = false;
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

      // Show the waiting card immediately and send the email in the
      // background — the n8n instance can cold-start for ~50s and the user
      // shouldn't stare at a frozen form meanwhile. The owner notification
      // now fires after verification succeeds, not here.
      this.registeredEmail = email!;
      this.registeredName = displayName!;
      this.sendVerificationRequest(cred.user.uid, email!, displayName!);
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

  // Google sign-in needs no verification step: the account is already
  // emailVerified, so this goes straight home rather than into the
  // link/code waiting screen the password flow uses.
  async continueWithGoogle() {
    if (this.googleLoading) return;

    this.googleLoading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      const cred = await this.authService.signInWithGoogle();

      let isNewAccount = false;
      try {
        isNewAccount = await this.userService.ensureUserDocument(cred.user.uid, {
          displayName: cred.user.displayName ?? '',
          email: cred.user.email ?? '',
          phone: cred.user.phoneNumber ?? '',
          photoURL: cred.user.photoURL ?? '',
        });
      } catch (firestoreError) {
        console.warn('Firestore user creation failed:', firestoreError);
        this.profileWarning =
          'Profile details could not be saved. You can complete them from Settings.';
      }

      if (isNewAccount) {
        const who = cred.user.displayName
          ? `${cred.user.displayName} <${cred.user.email}>`
          : cred.user.email;
        this.n8n
          .sendAdminAlert('user_registered', `${who} signed up with Google.`)
          .catch(err => console.warn('Admin alert webhook failed:', err));
      }

      this.router.navigate(['/']);
    } catch (e: any) {
      this.error = googleAuthErrorMessage(e?.code);
    } finally {
      this.googleLoading = false;
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

    // Resend is best-effort: one email was already sent by the original
    // signup, and landing back on the waiting screen matters more.
    this.registeredEmail = email!;
    this.sendVerificationRequest(cred.user.uid, email!, '');
    this.registrationComplete = true;
    this.scrollToVerifyCard();
    this.startPolling();
  }

  // Sends the link+code verification email through n8n; if that workflow is
  // unreachable, falls back to Firebase's own link-only email so the user is
  // never stranded without any way to verify. Runs in the background — on
  // total failure it surfaces through the resend error slot.
  private async sendVerificationRequest(uid: string, email: string, displayName: string) {
    try {
      await this.n8n.requestVerification(uid, email, displayName);
    } catch (n8nError) {
      console.warn('n8n verification webhook failed, falling back to Firebase:', n8nError);
      try {
        const user = this.authService.getCurrentUser();
        if (user) await this.authService.sendVerificationEmail(user);
      } catch (firebaseError) {
        console.warn('Firebase fallback email failed too:', firebaseError);
        this.resendError =
          'We could not send the verification email. Please use the resend button in a moment.';
        this.cdr.detectChanges();
      }
    }
  }

  // The typed-code path: n8n checks the code and flips emailVerified via the
  // admin API; a fresh reload of the user then reads as verified.
  async confirmCode() {
    const user = this.authService.getCurrentUser();
    if (!user || this.codeLoading) return;

    const code = this.codeControl.value.trim();
    if (!/^\d{6}$/.test(code)) {
      this.codeError = 'Enter the 6-digit code from the email.';
      this.cdr.detectChanges();
      return;
    }

    this.codeLoading = true;
    this.codeError = '';
    this.cdr.detectChanges();

    try {
      const verified = await this.n8n.confirmVerificationCode(user.uid, code);
      if (!verified) {
        this.codeError = 'That code is not right or has expired. Check the email and try again.';
        return;
      }
      await this.authService.reloadCurrentUser();
      this.completeVerification();
    } catch (e) {
      console.warn('Code confirmation failed:', e);
      this.codeError =
        'Could not check the code right now (the server may be waking up). Please try again.';
    } finally {
      this.codeLoading = false;
      this.cdr.detectChanges();
    }
  }

  // Single exit point for both paths (link click detected by polling, or a
  // confirmed code): notify the owner exactly once, then head home.
  private completeVerification() {
    this.stopPolling();
    if (!this.verifiedAlertSent) {
      this.verifiedAlertSent = true;
      const who = this.registeredName
        ? `${this.registeredName} <${this.registeredEmail}>`
        : this.registeredEmail;
      this.n8n
        .sendAdminAlert('user_verified', `${who} verified their account.`)
        .catch(err => console.warn('Admin alert webhook failed:', err));
    }
    this.router.navigate(['/']);
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
          this.completeVerification();
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
    this.cdr.detectChanges();

    try {
      await this.n8n.requestVerification(
        user.uid,
        this.registeredEmail || user.email || '',
        this.registeredName,
      );
      this.resendSuccess = true;
      setTimeout(() => {
        this.resendSuccess = false;
        this.cdr.detectChanges();
      }, 4000);
    } catch (n8nError) {
      console.warn('n8n resend failed, falling back to Firebase:', n8nError);
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
            ? 'Resends are rate-limited. The earlier email is still valid — check your spam folder, or wait a few minutes and try again.'
            : 'Could not resend the email right now. Please try again in a moment.';
      }
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
