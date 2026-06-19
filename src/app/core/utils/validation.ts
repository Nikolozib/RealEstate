const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARS_REGEX = /^[\d\s+\-().]+$/;
const NAME_REGEX = /^[\p{L}\s'\-.]+$/u;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/** Phone must contain only digits and common separators; 7–15 digits when provided. */
export function isValidPhone(value: string, required = false): boolean {
  const trimmed = value.trim();
  if (!trimmed) return !required;
  if (!PHONE_CHARS_REGEX.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 2 && NAME_REGEX.test(trimmed);
}

export function isValidPassword(value: string, minLength = 6): boolean {
  return value.length >= minLength;
}

export function isValidMessage(value: string, minLength = 10): boolean {
  return value.trim().length >= minLength;
}
