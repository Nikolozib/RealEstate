import { Component, OnInit, ChangeDetectorRef, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { SeoService } from '../../core/services/seo';
import { ToastService } from '../../core/services/toast';
import { User } from '../../core/services/models/user.model';
import {
  nameValidator,
  passwordValidator,
  passwordsMatchValidator,
  phoneValidator,
} from '../../core/utils/form-validators';
import * as AOS from 'aos';
import { initAos } from '../../core/utils/aos';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {
  private fb = inject(FormBuilder);

  user: User | null = null;
  loading = true;
  saving = false;
  saved = false;
  error = '';

  activeTab = 'profile';

  showChangePassword = false;
  showCurrentPassword = false;
  showNewPassword = false;
  changingPassword = false;
  passwordError = '';
  passwordSuccess = false;
  resetSending = false;
  resetEmailSent = false;

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  profileForm = this.fb.group({
    displayName: ['', [Validators.required, nameValidator()]],
    phone: ['', [phoneValidator(false)]],
  });

  passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, passwordValidator(6)]],
      confirmNewPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator('newPassword', 'confirmNewPassword') },
  );

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private seo: SeoService,
    private toast: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.seo.setPageMeta(
      'My Profile | RealEstate Georgia',
      'Manage your account and saved properties.'
    );
    this.seo.setCanonicalUrl('/profile');
    if (this.isBrowser) initAos({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });

    this.authService.currentUser$.pipe(take(1)).subscribe(async currentUser => {
      if (!currentUser) {
        this.router.navigate(['/auth/login']);
        return;
      }
      await this.loadUser(currentUser.uid);
    });
  }

  private async loadUser(uid: string) {
    this.loading = true;
    try {
      const userData = await firstValueFrom(this.userService.getUserById(uid));
      if (!userData) return;

      this.user = userData;
      this.profileForm.patchValue({
        displayName: userData.displayName || '',
        phone: userData.phone || '',
      });
      if (this.isBrowser) setTimeout(() => AOS.refresh(), 50);
    } catch (e) {
      console.error('Failed to load user profile:', e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  async saveProfile() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      const displayName = this.profileForm.controls.displayName;
      if (displayName.hasError('required')) this.error = 'Display name cannot be empty.';
      else if (displayName.hasError('invalidName')) {
        this.error = 'Please enter a valid name (letters only, at least 2 characters).';
      } else if (this.profileForm.controls.phone.hasError('invalidPhone')) {
        this.error = 'Please enter a valid phone number (digits only, 7–15 digits).';
      } else {
        this.error = 'Please check the form and try again.';
      }
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.error = '';
    this.cdr.detectChanges();

    const { displayName, phone } = this.profileForm.getRawValue();

    try {
      await this.userService.updateUserProfile(currentUser.uid, {
        displayName: displayName!,
        phone: phone ?? '',
      });
      // Update local state so the hero updates immediately
      if (this.user) {
        this.user.displayName = displayName!;
        this.user.phone = phone ?? '';
      }
      this.saved = true;
      this.toast.success('Profile updated.');
      setTimeout(() => {
        this.saved = false;
        this.cdr.detectChanges();
      }, 3000);
    } catch (e) {
      this.error = 'Failed to update profile. Please try again.';
      this.toast.error(this.error);
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  get newPasswordsMismatch(): boolean {
    const confirm = this.passwordForm.controls.confirmNewPassword;
    return !!confirm.value && this.passwordForm.hasError('passwordMismatch');
  }

  toggleChangePassword() {
    this.showChangePassword = !this.showChangePassword;
    this.passwordError = '';
    this.passwordSuccess = false;
    this.resetEmailSent = false;
    this.passwordForm.reset();
    this.showCurrentPassword = false;
    this.showNewPassword = false;
  }

  // Escape hatch for users who opened "change password" but don't remember
  // their current one: email them the same reset link the login page offers.
  async sendPasswordResetEmail() {
    const email = this.user?.email || this.authService.getCurrentUser()?.email;
    if (!email || this.resetSending) return;

    this.resetSending = true;
    this.passwordError = '';
    this.cdr.detectChanges();

    try {
      await this.authService.sendPasswordReset(email);
      this.resetEmailSent = true;
      this.toast.success('Password reset link sent to your email.');
    } catch (e) {
      console.error('Failed to send reset email:', e);
      this.toast.error('Failed to send the reset email. Please try again.');
    } finally {
      this.resetSending = false;
      this.cdr.detectChanges();
    }
  }

  async changePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      const { currentPassword, newPassword, confirmNewPassword } = this.passwordForm.controls;
      if (
        currentPassword.hasError('required') ||
        newPassword.hasError('required') ||
        confirmNewPassword.hasError('required')
      ) {
        this.passwordError = 'Please fill in all fields.';
      } else if (newPassword.hasError('invalidPassword')) {
        this.passwordError = 'New password must be at least 6 characters.';
      } else if (this.passwordForm.hasError('passwordMismatch')) {
        this.passwordError = 'New passwords do not match.';
      } else {
        this.passwordError = 'Please check the form and try again.';
      }
      this.cdr.detectChanges();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    if (newPassword === currentPassword) {
      this.passwordError = 'New password must be different from your current password.';
      this.cdr.detectChanges();
      return;
    }

    this.changingPassword = true;
    this.passwordError = '';
    this.cdr.detectChanges();

    try {
      await this.authService.changePassword(currentPassword!, newPassword!);
      this.passwordSuccess = true;
      this.toast.success('Password changed successfully.');
      this.passwordForm.reset();
      setTimeout(() => {
        this.showChangePassword = false;
        this.passwordSuccess = false;
        this.cdr.detectChanges();
      }, 2500);
    } catch (e: any) {
      this.passwordError = this.getPasswordErrorMessage(e.code);
      this.toast.error(this.passwordError);
    } finally {
      this.changingPassword = false;
      this.cdr.detectChanges();
    }
  }

  private getPasswordErrorMessage(code: string): string {
    switch (code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Current password is incorrect.';
      case 'auth/weak-password':
        return 'New password is too weak.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return 'Failed to change password. Please try again.';
    }
  }

  toggleCurrentPasswordVisibility() { this.showCurrentPassword = !this.showCurrentPassword; }
  toggleNewPasswordVisibility()     { this.showNewPassword = !this.showNewPassword; }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }

  getInitials(): string {
    const displayName = this.profileForm.value.displayName;
    if (!displayName) return '?';
    return displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
