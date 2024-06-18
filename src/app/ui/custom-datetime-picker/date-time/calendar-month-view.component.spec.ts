/**
 * calendar-month-view.component.spec
 */
import { OwlMonthViewComponent } from './calendar-month-view.component';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { OwlDateTimeIntl } from './date-time-picker-intl.service';
import { OwlNativeDateTimeModule } from './adapter/native-date-time.module';
import { OwlDateTimeModule } from './date-time.module';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { dispatchKeyboardEvent } from '../../test-helpers';
import {
  DOWN_ARROW,
  END,
  ENTER,
  HOME,
  LEFT_ARROW,
  PAGE_DOWN,
  PAGE_UP,
  RIGHT_ARROW,
  UP_ARROW,
} from '@angular/cdk/keycodes';

const JAN = 0,
  FEB = 1,
  MAR = 2,
  APR = 3,
  MAY = 4,
  JUN = 5,
  JUL = 6,
  AUG = 7,
  SEP = 8,
  OCT = 9,
  NOV = 10,
  DEC = 11;

describe('OwlMonthViewComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [OwlNativeDateTimeModule, OwlDateTimeModule],
      declarations: [StandardMonthViewComponent, MonthViewWithDateFilterComponent],
      providers: [OwlDateTimeIntl],
    }).compileComponents();
  }));

  describe('standard month view', () => {
    let fixture: ComponentFixture<StandardMonthViewComponent>;
    let testComponent: StandardMonthViewComponent;
    let monthViewDebugElement: DebugElement;
    let monthViewElement: HTMLElement;
    let monthViewInstance: OwlMonthViewComponent<Date>;

    beforeEach(() => {
      fixture = TestBed.createComponent(StandardMonthViewComponent);
      fixture.detectChanges();

      monthViewDebugElement = fixture.debugElement.query(
        By.directive(OwlMonthViewComponent),
      );
      monthViewElement = monthViewDebugElement.nativeElement;
      testComponent = fixture.componentInstance;
      monthViewInstance = monthViewDebugElement.componentInstance;
    });

    it('should have 42 calendar day cells', () => {
      const cellEls = monthViewElement.querySelectorAll('.owl-dt-calendar-cell');
      expect(cellEls.length).toBe(42);
    });

    it('should show selected date if in same month', () => {
      const selectedEl = monthViewElement.querySelector('.owl-dt-calendar-cell-selected');
      expect(selectedEl.innerHTML.trim()).toBe('10');
    });

    it('should NOT show selected date if in different month', () => {
      testComponent.selected = new Date(2018, MAR, 10);
      fixture.detectChanges();
      const selectedEl = monthViewElement.querySelector('.owl-dt-calendar-cell-selected');
      expect(selectedEl).toBeNull();
    });

    it('should mark active date', () => {
      const selectedElContent = monthViewElement.querySelector(
        '.owl-dt-calendar-cell-active .owl-dt-calendar-cell-content',
      );
      expect(selectedElContent.innerHTML.trim()).toBe('5');
    });

    it('should set Sunday as first day of week by default', () => {
      expect(monthViewInstance.firstDayOfWeek).toBe(0);
      const weekdayCells = monthViewElement.querySelectorAll('.owl-dt-weekday');
      expect(weekdayCells[0].getAttribute('aria-label')).toBe('Sunday');
    });

    it('should set Monday as first day of week if firstDayOfWeek set to 1', () => {
      monthViewInstance.firstDayOfWeek = 1;
      fixture.detectChanges();
      const weekdayCells = monthViewElement.querySelectorAll('.owl-dt-weekday');
      expect(weekdayCells[0].getAttribute('aria-label')).toBe('Monday');
    });

    it('should set Saturday as first day of week if firstDayOfWeek set to 6', () => {
      monthViewInstance.firstDayOfWeek = 6;
      fixture.detectChanges();
      const weekdayCells = monthViewElement.querySelectorAll('.owl-dt-weekday');
      expect(weekdayCells[0].getAttribute('aria-label')).toBe('Saturday');
    });

    it('should decrement date on left arrow press', () => {
      const calendarBodyEl = monthViewElement.querySelector('.owl-dt-calendar-body');
      dispatchKeyboardEvent(calendarBodyEl, 'keydown', LEFT_ARROW);
      fixture.detectChanges();
      expect(testComponent.pickerMoment).toEqual(new Date(2018, JAN, 4));

      monthViewInstance.pickerMoment = new Date(2017, JAN, 1);
      fixture.detectChanges();

      dispatchKeyboardEvent(calendarBodyEl, 'keydown', LEFT_ARROW);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2016, DEC, 31));
    });

    it('should increment date on right arrow press', () => {
      const calendarBodyEl = monthViewElement.querySelector('.owl-dt-calendar-body');
      dispatchKeyboardEvent(calendarBodyEl, 'keydown', RIGHT_ARROW);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2018, JAN, 6));

      dispatchKeyboardEvent(calendarBodyEl, 'keydown', RIGHT_ARROW);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2018, JAN, 7));
    });

    it('should go up a row on up arrow press', () => {
      const calendarBodyEl = monthViewElement.querySelector('.owl-dt-calendar-body');
      dispatchKeyboardEvent(calendarBodyEl, 'keydown', UP_ARROW);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2017, DEC, 29));

      monthViewInstance.pickerMoment = new Date(2017, JAN, 7);
      fixture.detectChanges();

      dispatchKeyboardEvent(calendarBodyEl, 'keydown', UP_ARROW);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2016, DEC, 31));
    });

    it('should go down a row on down arrow press', () => {
      const calendarBodyEl = monthViewElement.querySelector('.owl-dt-calendar-body');
      dispatchKeyboardEvent(calendarBodyEl, 'keydown', DOWN_ARROW);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2018, JAN, 12));

      dispatchKeyboardEvent(calendarBodyEl, 'keydown', DOWN_ARROW);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2018, JAN, 19));
    });

    it('should go to beginning of the month on home press', () => {
      monthViewInstance.pickerMoment = new Date(2018, JAN, 7);
      fixture.detectChanges();

      const calendarBodyEl = monthViewElement.querySelector('.owl-dt-calendar-body');
      dispatchKeyboardEvent(calendarBodyEl, 'keydown', HOME);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2018, JAN, 1));

      dispatchKeyboardEvent(calendarBodyEl, 'keydown', HOME);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2018, JAN, 1));
    });

    it('should go to end of the month on end press', () => {
      monthViewInstance.pickerMoment = new Date(2018, JAN, 7);
      fixture.detectChanges();

      const calendarBodyEl = monthViewElement.querySelector('.owl-dt-calendar-body');
      dispatchKeyboardEvent(calendarBodyEl, 'keydown', END);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2018, JAN, 31));

      dispatchKeyboardEvent(calendarBodyEl, 'keydown', END);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2018, JAN, 31));
    });

    it('should go back one month on page up press', () => {
      const calendarBodyEl = monthViewElement.querySelector('.owl-dt-calendar-body');
      dispatchKeyboardEvent(calendarBodyEl, 'keydown', PAGE_UP);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2017, DEC, 5));

      dispatchKeyboardEvent(calendarBodyEl, 'keydown', PAGE_UP);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2017, NOV, 5));
    });

    it('should go forward one month on page down press', () => {
      const calendarBodyEl = monthViewElement.querySelector('.owl-dt-calendar-body');
      dispatchKeyboardEvent(calendarBodyEl, 'keydown', PAGE_DOWN);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2018, FEB, 5));

      dispatchKeyboardEvent(calendarBodyEl, 'keydown', PAGE_DOWN);
      fixture.detectChanges();

      expect(testComponent.pickerMoment).toEqual(new Date(2018, MAR, 5));
    });

    it('should select active date on enter', () => {
      const calendarBodyEl = monthViewElement.querySelector('.owl-dt-calendar-body');
      dispatchKeyboardEvent(calendarBodyEl, 'keydown', LEFT_ARROW);
      fixture.detectChanges();

      expect(testComponent.selected).toEqual(new Date(2018, JAN, 10));

      dispatchKeyboardEvent(calendarBodyEl, 'keydown', ENTER);
      fixture.detectChanges();

      expect(testComponent.selected).toEqual(new Date(2018, JAN, 4));
    });
  });

  describe('month view with date filter', () => {
    let fixture: ComponentFixture<MonthViewWithDateFilterComponent>;
    let monthViewNativeElement: Element;

    beforeEach(() => {
      fixture = TestBed.createComponent(MonthViewWithDateFilterComponent);
      fixture.detectChanges();

      const monthViewDebugElement = fixture.debugElement.query(
        By.directive(OwlMonthViewComponent),
      );
      monthViewNativeElement = monthViewDebugElement.nativeElement;
    });

    it('should disable filtered dates', () => {
      const cellOne = monthViewNativeElement.querySelector(
        '[aria-label="January 1, 2018"]',
      );
      const cellTwo = monthViewNativeElement.querySelector(
        '[aria-label="January 2, 2018"]',
      );
      expect(cellOne.classList).toContain('owl-dt-calendar-cell-disabled');
      expect(cellTwo.classList).not.toContain('owl-dt-calendar-cell-disabled');
    });
  });
});

@Component({
  template: `
    <owl-date-time-month-view
      [(selected)]="selected"
      [(pickerMoment)]="pickerMoment"
    ></owl-date-time-month-view>
  `,
})
class StandardMonthViewComponent {
  selected = new Date(2018, JAN, 10);
  pickerMoment = new Date(2018, JAN, 5);
}

@Component({
  template: `
    <owl-date-time-month-view
      [(pickerMoment)]="pickerMoment"
      [dateFilter]="dateFilter"
    ></owl-date-time-month-view>
  `,
})
class MonthViewWithDateFilterComponent {
  pickerMoment = new Date(2018, JAN, 1);

  dateFilter(date: Date) {
    // tslint:disable-next-line:triple-equals
    return date.getDate() % 2 === 0;
  }
}
