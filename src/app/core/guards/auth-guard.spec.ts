import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  function setup(authServiceStub: Partial<AuthService>) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });
  }

  it('redirects to /auth/login when no user is signed in', async () => {
    setup({
      currentUser$: of(null),
      reloadCurrentUser: () => Promise.resolve(),
      getCurrentUser: () => null,
    } as Partial<AuthService>);

    const result = await firstValueFrom(executeGuard({} as any, {} as any) as any);
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login');
  });

  it('redirects to /auth/register when the account is unverified', async () => {
    const fakeUser = { uid: 'u1', emailVerified: false } as any;
    setup({
      currentUser$: of(fakeUser),
      reloadCurrentUser: () => Promise.resolve(),
      getCurrentUser: () => fakeUser,
    } as Partial<AuthService>);

    const result = await firstValueFrom(executeGuard({} as any, {} as any) as any);
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/auth/register');
  });

  it('allows activation once the account is verified', async () => {
    const fakeUser = { uid: 'u1', emailVerified: true } as any;
    setup({
      currentUser$: of(fakeUser),
      reloadCurrentUser: () => Promise.resolve(),
      getCurrentUser: () => fakeUser,
    } as Partial<AuthService>);

    const result = await firstValueFrom(executeGuard({} as any, {} as any) as any);

    expect(result).toBe(true);
  });
});
