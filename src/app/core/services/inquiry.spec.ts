import { TestBed } from '@angular/core/testing';

import { Inquiry } from './inquiry';

describe('Inquiry', () => {
  let service: Inquiry;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Inquiry);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
