import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Patientform } from './patientform';

describe('Patientform', () => {
  let component: Patientform;
  let fixture: ComponentFixture<Patientform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Patientform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Patientform);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
