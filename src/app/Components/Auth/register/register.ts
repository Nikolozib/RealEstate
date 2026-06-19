import { Component } from '@angular/core';
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
export class Register {
  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';
  loading = false;
  error = '';
  showPassword = false;
  showConfirm = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
  ) {}

  async register() {
    if (!this.displayName || !this.email || !this.password || !this.confirmPassword) {
      this.error = 'Please fill in all required fields.';
      return;
    }

    if (!isValidName(this.displayName)) {
      this.error = 'Please enter a valid name (letters only, at least 2 characters).';
      return;
    }

    if (!isValidEmail(this.email)) {
      this.error = 'Please enter a valid email address.';
      return;
    }

    if (this.phone.trim() && !isValidPhone(this.phone)) {
      this.error = 'Please enter a valid phone number (digits only, 7–15 digits).';
      return;
    }

    if (!isValidPassword(this.password)) {
      this.error = 'Password must be at least 6 characters.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.error = '';

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
      }
      // await cred.user.sendEmailVerification();
      this.router.navigate(['/']);
      
    } catch (e: any) {
      this.error = this.getErrorMessage(e.code);
    } finally {
      this.loading = false;
    }
  }

  getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      default:
        return 'Something went wrong. Please try again.';
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

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
  toggleConfirm() {
    this.showConfirm = !this.showConfirm;
  }
}
