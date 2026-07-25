import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Login } from './login';
import { firebaseTestProviders } from '../../../core/testing/test-providers';
import { AuthService } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';
import { N8nService } from '../../../core/services/n8n';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: firebaseTestProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('continueWithGoogle', () => {
    const googleUser = {
      uid: 'g1',
      email: 'someone@gmail.com',
      displayName: 'Someone',
      phoneNumber: null,
      photoURL: 'https://example.com/a.jpg',
    };

    function setupGoogle(overrides: {
      isNewAccount?: boolean;
      signInError?: unknown;
    } = {}) {
      const ensureUserDocument = vi
        .fn()
        .mockResolvedValue(overrides.isNewAccount ?? false);
      const sendAdminAlert = vi.fn().mockResolvedValue(undefined);
      const signInWithGoogle = overrides.signInError
        ? vi.fn().mockRejectedValue(overrides.signInError)
        : vi.fn().mockResolvedValue({ user: googleUser });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [Login],
        providers: [
          ...firebaseTestProviders(),
          { provide: AuthService, useValue: { signInWithGoogle } },
          { provide: UserService, useValue: { ensureUserDocument } },
          { provide: N8nService, useValue: { sendAdminAlert } },
        ],
      });

      const f = TestBed.createComponent(Login);
      const router = TestBed.inject(Router);
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      return { component: f.componentInstance, ensureUserDocument, sendAdminAlert, navigate };
    }

    it('signs a returning Google user in without re-announcing them', async () => {
      const { component, ensureUserDocument, sendAdminAlert, navigate } = setupGoogle({
        isNewAccount: false,
      });

      await component.continueWithGoogle();

      expect(ensureUserDocument).toHaveBeenCalledWith('g1', {
        displayName: 'Someone',
        email: 'someone@gmail.com',
        phone: '',
        photoURL: 'https://example.com/a.jpg',
      });
      expect(sendAdminAlert).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/']);
      expect(component.error).toBe('');
    });

    it('alerts the owner only when the Google sign-in created a new account', async () => {
      const { component, sendAdminAlert } = setupGoogle({ isNewAccount: true });

      await component.continueWithGoogle();

      expect(sendAdminAlert).toHaveBeenCalledTimes(1);
      expect(sendAdminAlert.mock.calls[0][0]).toBe('user_registered');
    });

    // Closing the popup is a deliberate action, not a failure — surfacing a
    // red error banner for it would be noise.
    it('stays silent when the user closes the popup', async () => {
      const { component, navigate } = setupGoogle({
        signInError: { code: 'auth/popup-closed-by-user' },
      });

      await component.continueWithGoogle();

      expect(component.error).toBe('');
      expect(navigate).not.toHaveBeenCalled();
      expect(component.googleLoading).toBe(false);
    });

    it('explains a blocked popup and clears the loading state', async () => {
      const { component } = setupGoogle({ signInError: { code: 'auth/popup-blocked' } });

      await component.continueWithGoogle();

      expect(component.error).toContain('blocked');
      expect(component.googleLoading).toBe(false);
    });
  });
});
