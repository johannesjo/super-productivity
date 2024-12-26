import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarPopoverComponent } from './popover-container';

describe('CalendarPopoverComponent', () => {
  let component: CalendarPopoverComponent;
  let fixture: ComponentFixture<CalendarPopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarPopoverComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
