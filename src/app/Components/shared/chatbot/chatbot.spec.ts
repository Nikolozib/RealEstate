import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Chatbot } from './chatbot';

describe('Chatbot', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Chatbot],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Chatbot);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open with a greeting message', () => {
    const fixture = TestBed.createComponent(Chatbot);
    const component = fixture.componentInstance;
    component.toggle();
    expect(component.open()).toBe(true);
    expect(component.messages().length).toBe(1);
    expect(component.messages()[0].role).toBe('assistant');
  });

  it('should linkify listing URLs with a friendly label', () => {
    const component = TestBed.createComponent(Chatbot).componentInstance;
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
    const component = TestBed.createComponent(Chatbot).componentInstance;
    expect(component.linkify('No links here.')).toEqual([{ text: 'No links here.' }]);
  });
});
