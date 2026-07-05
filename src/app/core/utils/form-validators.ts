import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  isValidEmail,
  isValidMessage,
  isValidName,
  isValidPassword,
  isValidPhone,
} from './validation';

// Thin ValidatorFn wrappers around the plain validation functions so both
// the reactive forms and any remaining manual checks share one source of
// truth for what counts as a valid email/name/phone/etc.
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    !control.value || isValidEmail(control.value) ? null : { invalidEmail: true };
}

export function nameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    !control.value || isValidName(control.value) ? null : { invalidName: true };
}

export function phoneValidator(required = false): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    isValidPhone(control.value ?? '', required) ? null : { invalidPhone: true };
}

export function passwordValidator(minLength = 6): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    !control.value || isValidPassword(control.value, minLength) ? null : { invalidPassword: true };
}

export function messageValidator(minLength = 10): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    !control.value || isValidMessage(control.value, minLength) ? null : { invalidMessage: true };
}

// Group-level validator — attach to the FormGroup, not an individual control.
export function passwordsMatchValidator(passwordKey: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value;
    const confirm = group.get(confirmKey)?.value;
    if (!confirm) return null;
    return password === confirm ? null : { passwordMismatch: true };
  };
}
