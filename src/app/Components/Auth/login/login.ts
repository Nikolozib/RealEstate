import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { emailValidator } from '../../../core/utils/form-validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);

  loading = false;
  error = '';
  showPassword = false;

  mode: 'login' | 'forgot' = 'login';
  resetSending = false;
  resetSent = false;
  resetError = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required, emailValidator()]],
    password: ['', [Validators.required]],
  });

  resetForm = this.fb.group({
    resetEmail: ['', [Validators.required, emailValidator()]],
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  async login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      const email = this.loginForm.controls.email;
      if (email.errors?.['required']) this.error = 'Please fill in all fields.';
      else if (email.errors?.['invalidEmail']) this.error = 'Please enter a valid email address.';
      else this.error = 'Please fill in all fields.';
      this.cdr.detectChanges();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      const cred = await this.authService.login(email!, password!);

      // Block unverified users — sign them out and show a clear message
      if (!cred.user.emailVerified) {
        await this.authService.logout();
        this.error =
          'Please verify your email before signing in. Check your inbox for the verification link.';
        return;
      }

      this.router.navigate(['/']);
    } catch (e: any) {
      this.error = this.getErrorMessage(e.code);
    } finally {
      this.loading = false;
      // This app runs zoneless: awaiting a Firebase call isn't tracked by
      // Angular's change-detection scheduler, so without this the UI would
      // only refresh once some unrelated event (a scroll, a click) happened
      // to trigger a tick elsewhere.
      this.cdr.detectChanges();
    }
  }

  getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  showForgotPassword() {
    this.mode = 'forgot';
    this.resetForm.patchValue({ resetEmail: this.loginForm.value.email ?? '' });
    this.resetError = '';
    this.resetSent = false;
  }

  backToLogin() {
    this.mode = 'login';
    this.resetError = '';
    this.resetSent = false;
  }

  async sendResetEmail() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      const resetEmail = this.resetForm.controls.resetEmail;
      if (resetEmail.errors?.['required']) this.resetError = 'Please enter your email address.';
      else this.resetError = 'Please enter a valid email address.';
      this.cdr.detectChanges();
      return;
    }

    this.resetSending = true;
    this.resetError = '';
    this.cdr.detectChanges();

    try {
      await this.authService.sendPasswordReset(this.resetForm.getRawValue().resetEmail!);
      this.resetSent = true;
    } catch (e: any) {
      // Don't reveal whether an account exists for this email — show the
      // same success state for "no account" as for a real send, and only
      // surface genuine problems (rate limiting, malformed email).
      if (e.code === 'auth/user-not-found') {
        this.resetSent = true;
      } else {
        this.resetError = this.getResetErrorMessage(e.code);
      }
    } finally {
      this.resetSending = false;
      this.cdr.detectChanges();
    }
  }

  private getResetErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
