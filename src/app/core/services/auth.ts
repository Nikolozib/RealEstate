import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';
 
@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  isLoggedIn$ = new BehaviorSubject<boolean>(false);
  currentUser$ = new BehaviorSubject<any>(null);
 
  constructor() {
    user(this.auth).subscribe(u => {
      this.isLoggedIn$.next(!!u);
      this.currentUser$.next(u);
    });
  }
 
  register(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }
 
  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }
 
  logout() {
    return signOut(this.auth);
  }
 
  getCurrentUser() {
    return this.auth.currentUser;
  }
}