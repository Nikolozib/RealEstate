import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { SeoService } from '../../core/services/seo';
import { User } from '../../core/services/models/user.model';
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
    private router: Router
  ) {}

  ngOnInit() {
    this.seo.setPageMeta('My Profile | RealEstate Georgia', 'Manage your account and saved properties.');
    AOS.init({ duration: 700, easing: 'ease-in-out', once: true, offset: 40 });

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) { this.router.navigate(['/auth/login']); return; }

    this.userService.getUserById(currentUser.uid).subscribe(userData => {
      this.user = userData;
      this.displayName = userData?.displayName || '';
      this.phone = userData?.phone || '';
      this.loading = false;
    });
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

    this.saving = true;
    this.error = '';

    try {
      await this.userService.updateUserProfile(currentUser.uid, {
        displayName: this.displayName,
        phone: this.phone
      });
      this.saved = true;
      setTimeout(() => this.saved = false, 3000);
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
    return this.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}