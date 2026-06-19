import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { SeoService } from '../../core/services/seo';
import { User } from '../../core/services/models/user.model';
import { isValidName, isValidPhone } from '../../core/utils/validation';
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

    // take(1): resolve once — avoids nested subscriptions re-running on every auth event
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
      // firstValueFrom replaces the inner .subscribe — no nested subscription leak
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
      return;
    }

    if (!isValidName(this.displayName)) {
      this.error = 'Please enter a valid name (letters only, at least 2 characters).';
      return;
    }

    if (this.phone.trim() && !isValidPhone(this.phone)) {
      this.error = 'Please enter a valid phone number (digits only, 7–15 digits).';
      return;
    }

    this.saving = true;
    this.error = '';

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
      setTimeout(() => (this.saved = false), 3000);
    } catch (e) {
      this.error = 'Failed to update profile. Please try again.';
    } finally {
      this.saving = false;
    }
  }

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