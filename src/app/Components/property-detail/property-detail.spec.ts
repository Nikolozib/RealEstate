import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropertyDetail } from './property-detail';
import { firebaseTestProviders } from '../../core/testing/test-providers';

describe('PropertyDetail', () => {
  let component: PropertyDetail;
  let fixture: ComponentFixture<PropertyDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropertyDetail],
      providers: firebaseTestProviders({ params: { id: 'test-id' }, data: { property: null } }),
    }).compileComponents();

    fixture = TestBed.createComponent(PropertyDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
