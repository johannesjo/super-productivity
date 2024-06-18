/**
 * calendar.component.spec
 */

import { async, ComponentFixture, inject, TestBed } from '@angular/core/testing';
import { Component, NgZone } from '@angular/core';
import {
  dispatchFakeEvent,
  dispatchKeyboardEvent,
  dispatchMouseEvent,
  MockNgZone,
} from '../../test-helpers';
import { OwlNativeDateTimeModule } from './adapter/native-date-time.module';
import { OwlDateTimeModule } from './date-time.module';
import { OwlCalendarComponent } from './calendar.component';
import { OwlDateTimeIntl } from './date-time-picker-intl.service';
import { By } from '@angular/platform-browser';
import { ENTER, RIGHT_ARROW } from '@angular/cdk/keycodes';
import { OwlMonthViewComponent } from './calendar-month-view.component';
import { OwlYearViewComponent } from './calendar-year-view.component';
import { OwlMultiYearViewComponent } from './calendar-multi-year-view.component';

export const JAN = 0,
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

describe('OwlCalendarComponent', () => {
  let zone: MockNgZone;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [OwlNativeDateTimeModule, OwlDateTimeModule],
      declarations: [
        StandardCalendarComponent,
        CalendarWithMinMaxComponent,
        CalendarWithDateFilterComponent,
      ],
      providers: [
        OwlDateTimeIntl,
        { provide: NgZone, useFactory: () => (zone = new MockNgZone()) },
      ],
    }).compileComponents();
  }));

  describe('standard calendar', () => {
    let fixture: ComponentFixture<StandardCalendarComponent>;
    let testComponent: StandardCalendarComponent;
    let calendarElement: HTMLElement;
    let periodButton: HTMLElement;
    let calendarInstance: OwlCalendarComponent<Date>;

    beforeEach(() => {
      fixture = TestBed.createComponent(StandardCalendarComponent);
      fixture.detectChanges();

      const calendarDebugElement = fixture.debugElement.query(
        By.directive(OwlCalendarComponent),
      );
      calendarElement = calendarDebugElement.nativeElement;

      periodButton = calendarElement.querySelector(
        '.owl-dt-control-period-button',
      ) as HTMLElement;
      calendarInstance = calendarDebugElement.componentInstance;
      testComponent = fixture.componentInstance;
    });

    it('should be in month view with specified month active', async(() => {
      expect(calendarInstance.currentView).toBe('month');
      expect(calendarInstance.pickerMoment).toEqual(new Date(2018, JAN, 31));
    }));

    it('should select date in month view', () => {
      const monthCell = calendarElement.querySelector('[aria-label="January 31, 2018"]');
      (monthCell as HTMLElement).click();

      fixture.detectChanges();
      expect(calendarInstance.currentView).toBe('month');
      expect(testComponent.selected).toEqual(new Date(2018, JAN, 31));
    });

    it('should emit the selected month on cell clicked in year view', () => {
      periodButton.click();
      fixture.detectChanges();

      expect(calendarInstance.currentView).toBe('multi-years');
      expect(calendarInstance.pickerMoment).toEqual(new Date(2018, JAN, 31));

      (
        calendarElement.querySelector('.owl-dt-calendar-cell-active') as HTMLElement
      ).click();

      fixture.detectChanges();

      expect(calendarInstance.currentView).toBe('year');

      (
        calendarElement.querySelector('.owl-dt-calendar-cell-active') as HTMLElement
      ).click();

      const normalizedMonth: Date = fixture.componentInstance.selectedMonth;
      expect(normalizedMonth.getMonth()).toEqual(0);
    });

    it('should emit the selected year on cell clicked in multi-years view', () => {
      periodButton.click();
      fixture.detectChanges();

      expect(calendarInstance.currentView).toBe('multi-years');
      expect(calendarInstance.pickerMoment).toEqual(new Date(2018, JAN, 31));
      (
        calendarElement.querySelector('.owl-dt-calendar-cell-active') as HTMLElement
      ).click();

      fixture.detectChanges();

      const normalizedYear: Date = fixture.componentInstance.selectedYear;
      expect(normalizedYear.getFullYear()).toEqual(2018);
    });

    it('should re-render when the i18n labels have changed', () => {
      inject([OwlDateTimeIntl], (intl: OwlDateTimeIntl) => {
        const button = fixture.debugElement.nativeElement.querySelector(
          '.owl-dt-control-period-button',
        );

        intl.switchToMultiYearViewLabel = 'Go to multi-year view?';
        intl.changes.next();
        fixture.detectChanges();

        expect(button.getAttribute('aria-label')).toBe('Go to multi-year view?');
      });
    });

    it('should set all buttons to be `type="button"`', () => {
      const invalidButtons = calendarElement.querySelectorAll(
        'button:not([type="button"])',
      );
      expect(invalidButtons.length).toBe(0);
    });

    describe('a11y', () => {
      describe('calendar body', () => {
        let calendarMainEl: HTMLElement;

        beforeEach(() => {
          calendarMainEl = calendarElement.querySelector(
            '.owl-dt-calendar-main',
          ) as HTMLElement;
          expect(calendarMainEl).not.toBeNull();

          dispatchFakeEvent(calendarMainEl, 'focus');
          fixture.detectChanges();
        });

        it('should initially set pickerMoment', () => {
          expect(calendarInstance.pickerMoment).toEqual(new Date(2018, JAN, 31));
        });

        it('should make the calendar main focusable', () => {
          expect(calendarMainEl.getAttribute('tabindex')).toBe('-1');
        });

        it('should not move focus to the active cell on init', () => {
          const activeCell = calendarMainEl.querySelector(
            '.owl-dt-calendar-cell-active',
          ) as HTMLElement;

          spyOn(activeCell, 'focus').and.callThrough();
          fixture.detectChanges();
          zone.simulateZoneExit();

          expect(activeCell.focus).not.toHaveBeenCalled();
        });

        it('should move focus to the active cell when the view changes', () => {
          const activeCell = calendarMainEl.querySelector(
            '.owl-dt-calendar-cell-active',
          ) as HTMLElement;

          spyOn(activeCell, 'focus').and.callThrough();
          fixture.detectChanges();
          zone.simulateZoneExit();

          expect(activeCell.focus).not.toHaveBeenCalled();

          calendarInstance.currentView = 'multi-years';
          fixture.detectChanges();
          zone.simulateZoneExit();

          expect(activeCell.focus).toHaveBeenCalled();
        });

        describe('year view', () => {
          beforeEach(() => {
            dispatchMouseEvent(periodButton, 'click');
            fixture.detectChanges();

            expect(calendarInstance.currentView).toBe('multi-years');

            (
              calendarMainEl.querySelector('.owl-dt-calendar-cell-active') as HTMLElement
            ).click();
            fixture.detectChanges();

            expect(calendarInstance.currentView).toBe('year');
          });

          it('should return to month view on enter', () => {
            const tableBodyEl = calendarMainEl.querySelector(
              '.owl-dt-calendar-body',
            ) as HTMLElement;

            dispatchKeyboardEvent(tableBodyEl, 'keydown', RIGHT_ARROW);
            fixture.detectChanges();

            dispatchKeyboardEvent(tableBodyEl, 'keydown', ENTER);
            fixture.detectChanges();

            expect(calendarInstance.currentView).toBe('month');
            expect(calendarInstance.pickerMoment).toEqual(new Date(2018, FEB, 28));
            expect(testComponent.selected).toBeUndefined();
          });
        });

        describe('multi-years view', () => {
          beforeEach(() => {
            dispatchMouseEvent(periodButton, 'click');
            fixture.detectChanges();

            expect(calendarInstance.currentView).toBe('multi-years');
          });

          it('should return to year view on enter', () => {
            const tableBodyEl = calendarMainEl.querySelector(
              '.owl-dt-calendar-body',
            ) as HTMLElement;

            dispatchKeyboardEvent(tableBodyEl, 'keydown', RIGHT_ARROW);
            fixture.detectChanges();

            dispatchKeyboardEvent(tableBodyEl, 'keydown', ENTER);
            fixture.detectChanges();

            expect(calendarInstance.currentView).toBe('year');
            expect(calendarInstance.pickerMoment).toEqual(new Date(2019, JAN, 31));
            expect(testComponent.selected).toBeUndefined();
          });
        });
      });
    });
  });

  describe('calendar with min and max', () => {
    let fixture: ComponentFixture<CalendarWithMinMaxComponent>;
    let testComponent: CalendarWithMinMaxComponent;
    let calendarElement: HTMLElement;
    let calendarInstance: OwlCalendarComponent<Date>;

    beforeEach(() => {
      fixture = TestBed.createComponent(CalendarWithMinMaxComponent);
      fixture.detectChanges();

      const calendarDebugElement = fixture.debugElement.query(
        By.directive(OwlCalendarComponent),
      );
      calendarElement = calendarDebugElement.nativeElement;

      calendarInstance = calendarDebugElement.componentInstance;
      testComponent = fixture.componentInstance;
    });

    it('should re-render the month view when the minDate changes', () => {
      const monthViewDebugElm = fixture.debugElement.query(
        By.directive(OwlMonthViewComponent),
      );
      const monthViewComp = monthViewDebugElm.componentInstance;
      expect(monthViewComp).toBeTruthy();

      spyOn(monthViewComp, 'generateCalendar').and.callThrough();
      testComponent.minDate = new Date(2017, NOV, 1);
      fixture.detectChanges();

      expect(monthViewComp.generateCalendar).toHaveBeenCalled();
    });

    it('should re-render the month view when the maxDate changes', () => {
      const monthViewDebugElm = fixture.debugElement.query(
        By.directive(OwlMonthViewComponent),
      );
      const monthViewComp = monthViewDebugElm.componentInstance;
      expect(monthViewComp).toBeTruthy();

      spyOn(monthViewComp, 'generateCalendar').and.callThrough();
      testComponent.maxDate = new Date(2017, NOV, 1);
      fixture.detectChanges();

      expect(monthViewComp.generateCalendar).toHaveBeenCalled();
    });

    it('should re-render the year view when the minDate changes', () => {
      fixture.detectChanges();
      const periodButton = calendarElement.querySelector(
        '.owl-dt-control-period-button',
      ) as HTMLElement;
      periodButton.click();
      fixture.detectChanges();

      (
        calendarElement.querySelector('.owl-dt-calendar-cell-active') as HTMLElement
      ).click();
      fixture.detectChanges();

      const yearViewDebugElm = fixture.debugElement.query(
        By.directive(OwlYearViewComponent),
      );
      const yearViewComp = yearViewDebugElm.componentInstance;
      expect(yearViewComp).toBeTruthy();

      spyOn(yearViewComp, 'generateMonthList').and.callThrough();
      testComponent.minDate = new Date(2017, NOV, 1);
      fixture.detectChanges();

      expect(yearViewComp.generateMonthList).toHaveBeenCalled();
    });

    it('should re-render the year view when the maxDate changes', () => {
      fixture.detectChanges();
      const periodButton = calendarElement.querySelector(
        '.owl-dt-control-period-button',
      ) as HTMLElement;
      periodButton.click();
      fixture.detectChanges();

      (
        calendarElement.querySelector('.owl-dt-calendar-cell-active') as HTMLElement
      ).click();
      fixture.detectChanges();

      const yearViewDebugElm = fixture.debugElement.query(
        By.directive(OwlYearViewComponent),
      );
      const yearViewComp = yearViewDebugElm.componentInstance;
      expect(yearViewComp).toBeTruthy();

      spyOn(yearViewComp, 'generateMonthList').and.callThrough();
      testComponent.maxDate = new Date(2017, NOV, 1);
      fixture.detectChanges();

      expect(yearViewComp.generateMonthList).toHaveBeenCalled();
    });

    it('should re-render the multi-years view when the minDate changes', () => {
      fixture.detectChanges();
      const periodButton = calendarElement.querySelector(
        '.owl-dt-control-period-button',
      ) as HTMLElement;
      periodButton.click();
      fixture.detectChanges();

      const multiYearsViewDebugElm = fixture.debugElement.query(
        By.directive(OwlMultiYearViewComponent),
      );
      const multiYearsViewComp = multiYearsViewDebugElm.componentInstance;
      expect(multiYearsViewComp).toBeTruthy();

      spyOn(multiYearsViewComp, 'generateYearList').and.callThrough();
      testComponent.minDate = new Date(2017, NOV, 1);
      fixture.detectChanges();

      expect(multiYearsViewComp.generateYearList).toHaveBeenCalled();
    });

    it('should re-render the multi-years view when the maxDate changes', () => {
      fixture.detectChanges();
      const periodButton = calendarElement.querySelector(
        '.owl-dt-control-period-button',
      ) as HTMLElement;
      periodButton.click();
      fixture.detectChanges();

      const multiYearsViewDebugElm = fixture.debugElement.query(
        By.directive(OwlMultiYearViewComponent),
      );
      const multiYearsViewComp = multiYearsViewDebugElm.componentInstance;
      expect(multiYearsViewComp).toBeTruthy();

      spyOn(multiYearsViewComp, 'generateYearList').and.callThrough();
      testComponent.maxDate = new Date(2017, NOV, 1);
      fixture.detectChanges();

      expect(multiYearsViewComp.generateYearList).toHaveBeenCalled();
    });
  });

  describe('calendar with date filter', () => {
    let fixture: ComponentFixture<CalendarWithDateFilterComponent>;
    let testComponent: CalendarWithDateFilterComponent;
    let calendarElement: HTMLElement;
    let calendarInstance: OwlCalendarComponent<Date>;

    beforeEach(() => {
      fixture = TestBed.createComponent(CalendarWithDateFilterComponent);
      fixture.detectChanges();

      const calendarDebugElement = fixture.debugElement.query(
        By.directive(OwlCalendarComponent),
      );
      calendarElement = calendarDebugElement.nativeElement;
      calendarInstance = calendarDebugElement.componentInstance;
      testComponent = fixture.componentInstance;
    });

    it('should disable and prevent selection of filtered dates', () => {
      const monthCell = calendarElement.querySelector('[aria-label="January 2, 2018"]');
      expect(testComponent.selected).toBeFalsy();

      (monthCell as HTMLElement).click();
      fixture.detectChanges();

      expect(testComponent.selected).toEqual(new Date(2018, JAN, 2));
    });
  });
});

@Component({
  template: `
    <owl-date-time-calendar
      [(selected)]="selected"
      [selectMode]="selectMode"
      [pickerMoment]="pickerMoment"
      (monthSelected)="selectedMonth = $event"
      (yearSelected)="selectedYear = $event"
    ></owl-date-time-calendar>
  `,
})
class StandardCalendarComponent {
  selectMode = 'single';
  selected: Date;
  selectedYear: Date;
  selectedMonth: Date;
  pickerMoment = new Date(2018, JAN, 31);
}

@Component({
  template: `
    <owl-date-time-calendar
      [selectMode]="selectMode"
      [pickerMoment]="pickerMoment"
      [minDate]="minDate"
      [maxDate]="maxDate"
    ></owl-date-time-calendar>
  `,
})
class CalendarWithMinMaxComponent {
  selectMode = 'single';
  startAt: Date;
  minDate = new Date(2016, JAN, 1);
  maxDate = new Date(2019, JAN, 1);
  pickerMoment = new Date(2018, JAN, 31);
}

@Component({
  template: `
    <owl-date-time-calendar
      [(selected)]="selected"
      [selectMode]="selectMode"
      [pickerMoment]="pickerMoment"
      [dateFilter]="dateFilter"
    ></owl-date-time-calendar>
  `,
})
class CalendarWithDateFilterComponent {
  selectMode = 'single';
  selected: Date;
  pickerMoment = new Date(2018, JAN, 31);

  dateFilter(date: Date) {
    return !(date.getDate() % 2) && date.getMonth() !== NOV;
  }
}
