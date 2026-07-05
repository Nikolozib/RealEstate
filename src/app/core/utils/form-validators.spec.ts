import { FormControl, FormGroup } from '@angular/forms';
import {
  emailValidator,
  messageValidator,
  nameValidator,
  passwordValidator,
  passwordsMatchValidator,
  phoneValidator,
} from './form-validators';

describe('emailValidator', () => {
  const validate = emailValidator();

  it('accepts a well-formed email', () => {
    expect(validate(new FormControl('user@example.com'))).toBeNull();
  });

  it('rejects a malformed email', () => {
    expect(validate(new FormControl('not-an-email'))).toEqual({ invalidEmail: true });
  });

  it('treats an empty value as valid (defer to required)', () => {
    expect(validate(new FormControl(''))).toBeNull();
  });
});

describe('nameValidator', () => {
  const validate = nameValidator();

  it('accepts a plain name', () => {
    expect(validate(new FormControl('Nino Beridze'))).toBeNull();
  });

  it('rejects a name with digits', () => {
    expect(validate(new FormControl('Nino123'))).toEqual({ invalidName: true });
  });

  it('rejects a single character', () => {
    expect(validate(new FormControl('N'))).toEqual({ invalidName: true });
  });
});

describe('phoneValidator', () => {
  it('treats an empty value as valid when not required', () => {
    expect(phoneValidator(false)(new FormControl(''))).toBeNull();
  });

  it('rejects an empty value when required', () => {
    expect(phoneValidator(true)(new FormControl(''))).toEqual({ invalidPhone: true });
  });

  it('accepts a valid digit count', () => {
    expect(phoneValidator()(new FormControl('+995 555 000 000'))).toBeNull();
  });

  it('rejects too few digits', () => {
    expect(phoneValidator()(new FormControl('123'))).toEqual({ invalidPhone: true });
  });
});

describe('passwordValidator', () => {
  const validate = passwordValidator(6);

  it('accepts a password meeting the minimum length', () => {
    expect(validate(new FormControl('abcdef'))).toBeNull();
  });

  it('rejects a password below the minimum length', () => {
    expect(validate(new FormControl('abc'))).toEqual({ invalidPassword: true });
  });
});

describe('messageValidator', () => {
  const validate = messageValidator(10);

  it('accepts a message meeting the minimum length', () => {
    expect(validate(new FormControl('this is a long enough message'))).toBeNull();
  });

  it('rejects a too-short message', () => {
    expect(validate(new FormControl('short'))).toEqual({ invalidMessage: true });
  });
});

describe('passwordsMatchValidator', () => {
  function makeGroup(password: string, confirm: string) {
    return new FormGroup({
      password: new FormControl(password),
      confirmPassword: new FormControl(confirm),
    });
  }

  it('passes when both fields match', () => {
    const validate = passwordsMatchValidator('password', 'confirmPassword');
    expect(validate(makeGroup('secret1', 'secret1'))).toBeNull();
  });

  it('fails when the fields differ', () => {
    const validate = passwordsMatchValidator('password', 'confirmPassword');
    expect(validate(makeGroup('secret1', 'secret2'))).toEqual({ passwordMismatch: true });
  });

  it('does not flag a mismatch before the confirm field has a value', () => {
    const validate = passwordsMatchValidator('password', 'confirmPassword');
    expect(validate(makeGroup('secret1', ''))).toBeNull();
  });
});
