import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WorklogAndCalendarComponent } from './worklog-and-calendar.component';

describe('WorklogAndCalendarComponent', () => {
  let component: WorklogAndCalendarComponent;
  let fixture: ComponentFixture<WorklogAndCalendarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WorklogAndCalendarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WorklogAndCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
