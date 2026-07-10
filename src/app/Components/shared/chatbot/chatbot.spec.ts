import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Chatbot } from './chatbot';
import { AuthService } from '../../../core/services/auth';
import { N8nService } from '../../../core/services/n8n';

const verifiedUser = { uid: 'test-uid', emailVerified: true };

function setup(user: unknown = verifiedUser, n8n?: Partial<N8nService>) {
  TestBed.configureTestingModule({
    imports: [Chatbot],
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: AuthService, useValue: { currentUser$: of(user) } },
      ...(n8n ? [{ provide: N8nService, useValue: n8n }] : []),
    ],
  });
  return TestBed.createComponent(Chatbot);
}

describe('Chatbot', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open with a greeting message for a verified user', () => {
    const component = setup().componentInstance;
    component.toggle();
    expect(component.open()).toBe(true);
    expect(component.signedIn()).toBe(true);
    expect(component.messages().length).toBe(1);
    expect(component.messages()[0].role).toBe('assistant');
  });

  it('should treat signed-out visitors as locked and load no conversation', () => {
    const component = setup(null).componentInstance;
    component.toggle();
    expect(component.open()).toBe(true);
    expect(component.signedIn()).toBe(false);
    expect(component.messages().length).toBe(0);
  });

  it('should treat unverified users as signed out', () => {
    const component = setup({ uid: 'u2', emailVerified: false }).componentInstance;
    expect(component.signedIn()).toBe(false);
  });

  it('should keep conversations separate per user', () => {
    const thread = [{ role: 'user', content: 'my secret question' }];
    localStorage.setItem('rs-chat-history:test-uid', JSON.stringify(thread));

    // The owner gets their saved thread back…
    const owner = setup().componentInstance;
    owner.toggle();
    expect(owner.messages().some(m => m.content === 'my secret question')).toBe(true);

    // …but a different account on the same device must not see it.
    TestBed.resetTestingModule();
    const other = setup({ uid: 'other-uid', emailVerified: true }).componentInstance;
    other.toggle();
    expect(other.messages().some(m => m.content === 'my secret question')).toBe(false);
  });

  it('should serve repeated opening questions from the cache', async () => {
    let webhookCalls = 0;
    const n8nMock = {
      chat: async () => {
        webhookCalls++;
        return 'We cover all of Georgia.';
      },
    } as unknown as Partial<N8nService>;

    const first = setup(verifiedUser, n8nMock).componentInstance;
    first.toggle();
    first.draft = 'What areas do you cover?';
    await first.send();
    expect(webhookCalls).toBe(1);

    // A different user asking the same opening question gets the cached
    // answer without another webhook round-trip.
    TestBed.resetTestingModule();
    const second = setup({ uid: 'other-uid', emailVerified: true }, n8nMock).componentInstance;
    second.toggle();
    second.draft = 'What areas do you cover?';
    await second.send();
    expect(webhookCalls).toBe(1);
    expect(second.messages().at(-1)?.content).toBe('We cover all of Georgia.');
  });

  it('should linkify listing URLs with a friendly label', () => {
    const component = setup().componentInstance;
    const parts = component.linkify(
      'Check this out: https://realsang.netlify.app/listings/abc123. Great value!'
    );
    expect(parts).toEqual([
      { text: 'Check this out: ' },
      { text: 'View listing', href: 'https://realsang.netlify.app/listings/abc123' },
      { text: '. Great value!' },
    ]);
  });

  it('should return plain text untouched', () => {
    const component = setup().componentInstance;
    expect(component.linkify('No links here.')).toEqual([{ text: 'No links here.' }]);
  });
});
