import { Component, OnInit, HostListener, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit {
  isScrolled = false;
  isVisible = false;
  isMenuOpen = false;
  // Only true once the session is email-verified — an unverified Firebase
  // session must render as logged-out here (see AuthService.isVerified$).
  isVerified = false;
  isAdmin = false;

  private readonly scrollThreshold = 50;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.updateScrollState();

    this.authService.isVerified$.subscribe(status => {
      this.isVerified = status;

      if (status) {
        const user = this.authService.getCurrentUser();
        if (user) {
          this.userService.getUserById(user.uid).subscribe(userData => {
            this.isAdmin = userData?.role === 'admin' || userData?.role === 'agent';
          });
        }
      } else {
        this.isAdmin = false;
      }
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    this.updateScrollState();
  }

  private updateScrollState() {
    const scrolled = this.isBrowser && window.scrollY > this.scrollThreshold;
    this.isScrolled = scrolled;
    this.isVisible = scrolled || this.isMenuOpen;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this.updateScrollState();
  }

  closeMenu() {
    this.isMenuOpen = false;
    this.updateScrollState();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
    this.closeMenu();
  }
}