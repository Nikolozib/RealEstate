import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import { adminGuard } from './admin-guard';
import { AuthService } from '../services/auth';
import { UserService } from '../services/user';

describe('adminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

  function setup(authServiceStub: Partial<AuthService>, userServiceStub: Partial<UserService>) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
        { provide: UserService, useValue: userServiceStub },
      ],
    });
  }

  it('redirects to /auth/login when the account is unverified', async () => {
    setup(
      { isVerified$: of(false), getCurrentUser: () => null } as Partial<AuthService>,
      { getUserById: () => of(null as any) } as Partial<UserService>,
    );

    const result = await firstValueFrom(executeGuard({} as any, {} as any) as any);
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login');
  });

  it('redirects to / when the user has no admin/agent role', async () => {
    setup(
      { isVerified$: of(true), getCurrentUser: () => ({ uid: 'u1' } as any) } as Partial<AuthService>,
      { getUserById: () => of({ role: 'user' } as any) } as Partial<UserService>,
    );

    const result = await firstValueFrom(executeGuard({} as any, {} as any) as any);
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });

  it.each(['admin', 'agent'])('allows activation for role %s', async (role) => {
    setup(
      { isVerified$: of(true), getCurrentUser: () => ({ uid: 'u1' } as any) } as Partial<AuthService>,
      { getUserById: () => of({ role } as any) } as Partial<UserService>,
    );

    const result = await firstValueFrom(executeGuard({} as any, {} as any) as any);

    expect(result).toBe(true);
  });
});
