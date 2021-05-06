import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimelineCustomEventComponent } from './timeline-custom-event.component';

describe('TimelineCustomEventComponent', () => {
  let component: TimelineCustomEventComponent;
  let fixture: ComponentFixture<TimelineCustomEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TimelineCustomEventComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineCustomEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
