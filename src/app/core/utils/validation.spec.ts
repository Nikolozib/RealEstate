import {
  isValidEmail,
  isValidMessage,
  isValidName,
  isValidPassword,
  isValidPhone,
} from './validation';

describe('isValidEmail', () => {
  it('accepts standard addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('rejects addresses without a domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects addresses without an @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('accepts a properly formatted number', () => {
    expect(isValidPhone('+995 555 000 000')).toBe(true);
  });

  it('rejects too few digits', () => {
    expect(isValidPhone('12345')).toBe(false);
  });

  it('rejects letters', () => {
    expect(isValidPhone('555-CALL-NOW')).toBe(false);
  });

  it('treats blank as valid when not required', () => {
    expect(isValidPhone('', false)).toBe(true);
  });

  it('treats blank as invalid when required', () => {
    expect(isValidPhone('', true)).toBe(false);
  });
});

describe('isValidName', () => {
  it('accepts names with hyphens and apostrophes', () => {
    expect(isValidName("Jean-Luc O'Brien")).toBe(true);
  });

  it('rejects names with digits', () => {
    expect(isValidName('Agent007')).toBe(false);
  });

  it('rejects single-character names', () => {
    expect(isValidName('A')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('accepts a password at the minimum length', () => {
    expect(isValidPassword('abcdef')).toBe(true);
  });

  it('rejects a password below the minimum length', () => {
    expect(isValidPassword('abc')).toBe(false);
  });
});

describe('isValidMessage', () => {
  it('accepts a message at the minimum length', () => {
    expect(isValidMessage('this is long enough')).toBe(true);
  });

  it('rejects a too-short message', () => {
    expect(isValidMessage('short')).toBe(false);
  });
});
