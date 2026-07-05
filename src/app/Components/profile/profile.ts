import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { SeoService } from '../../core/services/seo';
import { User } from '../../core/services/models/user.model';
import { isValidName, isValidPassword, isValidPhone } from '../../core/utils/validation';
import * as AOS from 'aos';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {
  user: User | null = null;
  loading = true;
  saving = false;
  saved = false;
  error = '';

  displayName = '';
  phone = '';
  activeTab = 'profile';

  showChangePassword = false;
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  changingPassword = false;
  passwordError = '';
  passwordSuccess = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private seo: SeoService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.seo.setPageMeta(
      'My Profile | RealEstate Georgia',
      'Manage your account and saved properties.'
    );
    AOS.init({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });

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
      this.displayName = userData.displayName || '';
      this.phone = userData.phone || '';
      setTimeout(() => AOS.refresh(), 50);
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
    if (!currentUser || !this.displayName.trim()) {
      this.error = 'Display name cannot be empty.';
      this.cdr.detectChanges();
      return;
    }

    if (!isValidName(this.displayName)) {
      this.error = 'Please enter a valid name (letters only, at least 2 characters).';
      this.cdr.detectChanges();
      return;
    }

    if (this.phone.trim() && !isValidPhone(this.phone)) {
      this.error = 'Please enter a valid phone number (digits only, 7–15 digits).';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      await this.userService.updateUserProfile(currentUser.uid, {
        displayName: this.displayName,
        phone: this.phone
      });
      // Update local state so the hero updates immediately
      if (this.user) {
        this.user.displayName = this.displayName;
        this.user.phone = this.phone;
      }
      this.saved = true;
      setTimeout(() => {
        this.saved = false;
        this.cdr.detectChanges();
      }, 3000);
    } catch (e) {
      this.error = 'Failed to update profile. Please try again.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  toggleChangePassword() {
    this.showChangePassword = !this.showChangePassword;
    this.passwordError = '';
    this.passwordSuccess = false;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.showCurrentPassword = false;
    this.showNewPassword = false;
  }

  async changePassword() {
    if (!this.currentPassword || !this.newPassword || !this.confirmNewPassword) {
      this.passwordError = 'Please fill in all fields.';
      this.cdr.detectChanges();
      return;
    }

    if (!isValidPassword(this.newPassword)) {
      this.passwordError = 'New password must be at least 6 characters.';
      this.cdr.detectChanges();
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordError = 'New passwords do not match.';
      this.cdr.detectChanges();
      return;
    }

    if (this.newPassword === this.currentPassword) {
      this.passwordError = 'New password must be different from your current password.';
      this.cdr.detectChanges();
      return;
    }

    this.changingPassword = true;
    this.passwordError = '';
    this.cdr.detectChanges();

    try {
      await this.authService.changePassword(this.currentPassword, this.newPassword);
      this.passwordSuccess = true;
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
      setTimeout(() => {
        this.showChangePassword = false;
        this.passwordSuccess = false;
        this.cdr.detectChanges();
      }, 2500);
    } catch (e: any) {
      this.passwordError = this.getPasswordErrorMessage(e.code);
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
    if (!this.displayName) return '?';
    return this.displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}