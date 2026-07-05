import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import { guestGuard } from './guest-guard';
import { AuthService } from '../services/auth';

describe('guestGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => guestGuard(...guardParameters));

  function setup(authServiceStub: Partial<AuthService>) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });
  }

  it('redirects a verified user away from the auth pages', async () => {
    setup({ isVerified$: of(true) } as Partial<AuthService>);

    const result = await firstValueFrom(executeGuard({} as any, {} as any) as any);
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });

  it('allows an unverified/signed-out visitor to see the auth pages', async () => {
    setup({ isVerified$: of(false) } as Partial<AuthService>);

    const result = await firstValueFrom(executeGuard({} as any, {} as any) as any);

    expect(result).toBe(true);
  });
});
