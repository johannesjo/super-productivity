import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoryAndCalendarComponent } from './history-and-calendar.component';

describe('HistoryAndCalendarComponent', () => {
  let component: HistoryAndCalendarComponent;
  let fixture: ComponentFixture<HistoryAndCalendarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HistoryAndCalendarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoryAndCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
