import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusModeTaskDoneComponent } from './focus-mode-task-done.component';

describe('FocusModeTaskDoneComponent', () => {
  let component: FocusModeTaskDoneComponent;
  let fixture: ComponentFixture<FocusModeTaskDoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FocusModeTaskDoneComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FocusModeTaskDoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
