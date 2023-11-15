import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusModePreparationComponent } from './focus-mode-preparation.component';

describe('FocusModePreparationComponent', () => {
  let component: FocusModePreparationComponent;
  let fixture: ComponentFixture<FocusModePreparationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FocusModePreparationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FocusModePreparationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
