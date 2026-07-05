import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Listings } from './listings';
import { firebaseTestProviders } from '../../core/testing/test-providers';

describe('Listings', () => {
  let component: Listings;
  let fixture: ComponentFixture<Listings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Listings],
      providers: firebaseTestProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(Listings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
