import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimelineRepeatTaskProjectionComponent } from './timeline-repeat-task-projection.component';

describe('TimelineCustomEventComponent', () => {
  let component: TimelineRepeatTaskProjectionComponent;
  let fixture: ComponentFixture<TimelineRepeatTaskProjectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TimelineRepeatTaskProjectionComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineRepeatTaskProjectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
