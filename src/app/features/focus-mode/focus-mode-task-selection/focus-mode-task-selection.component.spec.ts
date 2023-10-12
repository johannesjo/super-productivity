import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusModeTaskSelectionComponent } from './focus-mode-task-selection.component';

describe('FocusModeTaskSelectionComponent', () => {
  let component: FocusModeTaskSelectionComponent;
  let fixture: ComponentFixture<FocusModeTaskSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FocusModeTaskSelectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FocusModeTaskSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
