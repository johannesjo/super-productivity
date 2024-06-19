/**
 * date-time-picker-container.component
 */

import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { AnimationEvent } from '@angular/animations';
import { OwlDateTimeIntl } from './date-time-picker-intl.service';
import { OwlCalendarComponent } from './calendar.component';
import { OwlTimerComponent } from './timer.component';
import { DateTimeAdapter } from './adapter/date-time-adapter.class';
import { OwlDateTime, PickerType } from './date-time.class';
import { Observable, of, Subject, Subscription, timer } from 'rxjs';
import { owlDateTimePickerAnimations } from './date-time-picker.animations';
import {
  DOWN_ARROW,
  ENTER,
  LEFT_ARROW,
  RIGHT_ARROW,
  SPACE,
  UP_ARROW,
} from '@angular/cdk/keycodes';
import { mapTo, startWith, switchMap } from 'rxjs/operators';
import { getWeekNumber } from './get-week-number';

@Component({
  exportAs: 'owlDateTimeContainer',
  selector: 'owl-date-time-container',
  templateUrl: './date-time-picker-container.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
  animations: [
    owlDateTimePickerAnimations.transformPicker,
    owlDateTimePickerAnimations.fadeInPicker,
    owlDateTimePickerAnimations.fade,
  ],
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '(@transformPicker.done)': 'handleContainerAnimationDone($event)',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-container]': 'owlDTContainerClass',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-popup-container]': 'owlDTPopupContainerClass',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-dialog-container]': 'owlDTDialogContainerClass',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-inline-container]': 'owlDTInlineContainerClass',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-container-disabled]': 'owlDTContainerDisabledClass',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[attr.id]': 'owlDTContainerId',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[@transformPicker]': 'owlDTContainerAnimation',
  },
})
export class OwlDateTimeContainerComponent<T>
  implements OnInit, AfterContentInit, AfterViewInit, OnDestroy
{
  @ViewChild(OwlCalendarComponent)
  calendar!: OwlCalendarComponent<T>;
  @ViewChild(OwlTimerComponent)
  timer!: OwlTimerComponent<T>;
  picker!: OwlDateTime<T>;
  activeSelectedIndex = 0; // The current active SelectedIndex in range select mode (0: 'from', 1: 'to')
  private _triggerPopup$ = new Subject<boolean>();
  // typing aren't needed since TypeScript will get the type by parsing the code
  isShowPopup$ = this._triggerPopup$.pipe(
    switchMap((isShow) =>
      isShow
        ? timer(1000).pipe(
            mapTo(false),
            startWith(true), // until the timer fires, you'll have this value
          )
        : of(false),
    ),
  );
  // retain start and end time
  private retainStartTime!: T;
  private retainEndTime!: T;

  /**
   * Stream emits when try to hide picker
   * */
  private hidePicker$ = new Subject<any>();
  /**
   * Stream emits when try to confirm the selected value
   * */
  private confirmSelected$ = new Subject<any>();
  private pickerOpened$ = new Subject<any>();
  /**
   * The current picker moment. This determines which time period is shown and which date is
   * highlighted when using keyboard navigation.
   */
  private _clamPickerMoment!: T;
  private _lastFocusEl!: HTMLInputElement | HTMLTableCellElement | HTMLButtonElement;
  private _lastBtn!: HTMLButtonElement;
  private _subs = new Subscription();

  constructor(
    private cdRef: ChangeDetectorRef,
    private elmRef: ElementRef,
    private pickerIntl: OwlDateTimeIntl,
    // todo check
    // @Optional()
    private dateTimeAdapter: DateTimeAdapter<T>,
  ) {}

  get hidePickerStream(): Observable<any> {
    return this.hidePicker$.asObservable();
  }

  get confirmSelectedStream(): Observable<any> {
    return this.confirmSelected$.asObservable();
  }

  get pickerOpenedStream(): Observable<any> {
    return this.pickerOpened$.asObservable();
  }

  get pickerMoment(): T {
    return this._clamPickerMoment;
  }

  set pickerMoment(value: T) {
    if (value) {
      this._clamPickerMoment = this.dateTimeAdapter.clampDate(
        value,
        this.picker.minDateTime,
        this.picker.maxDateTime,
      );
    }
    this.cdRef.markForCheck();
  }

  get pickerType(): PickerType {
    return this.picker.pickerType;
  }

  get cancelLabel(): string {
    return this.pickerIntl.cancelBtnLabel;
  }

  get setLabel(): string {
    return this.pickerIntl.setBtnLabel;
  }

  /**
   * The range 'from' label
   * */
  get fromLabel(): string {
    return this.pickerIntl.rangeFromLabel;
  }

  /**
   * The range 'to' label
   * */
  get toLabel(): string {
    return this.pickerIntl.rangeToLabel;
  }

  /**
   * The range 'from' formatted value
   * */
  get fromFormattedValue(): string {
    // @ts-ignore
    const value = this.picker.selecteds[0];
    return value ? this.dateTimeAdapter.format(value, this.picker.formatString) : '';
  }

  /**
   * The range 'to' formatted value
   * */
  get toFormattedValue(): string {
    // @ts-ignore
    const value = this.picker.selecteds[1];
    return value ? this.dateTimeAdapter.format(value, this.picker.formatString) : '';
  }

  /**
   * Cases in which the control buttons show in the picker
   * 1) picker mode is 'dialog'
   * 2) picker type is NOT 'calendar' and the picker mode is NOT 'inline'
   * */
  get showControlButtons(): boolean {
    return (
      this.picker.pickerMode === 'dialog' ||
      (this.picker.pickerType !== 'calendar' && this.picker.pickerMode !== 'inline')
    );
  }

  get containerElm(): HTMLElement {
    return this.elmRef.nativeElement;
  }

  get owlDTContainerClass(): boolean {
    return true;
  }

  get owlDTPopupContainerClass(): boolean {
    return this.picker.pickerMode === 'popup';
  }

  get owlDTDialogContainerClass(): boolean {
    return this.picker.pickerMode === 'dialog';
  }

  get owlDTInlineContainerClass(): boolean {
    return this.picker.pickerMode === 'inline';
  }

  get owlDTContainerDisabledClass(): boolean {
    return this.picker.disabled;
  }

  get owlDTContainerId(): string {
    return this.picker.id;
  }

  get owlDTContainerAnimation(): any {
    return this.picker.pickerMode === 'inline' ? '' : 'enter';
  }

  get isToday(): boolean {
    if (!this.picker.selected) {
      return false;
    }
    const now = this.dateTimeAdapter.now();
    return this.dateTimeAdapter.isSameDay(this.picker.selected, now);
  }

  get isTomorrow(): boolean {
    if (!this.picker.selected) {
      return false;
    }
    const now = this.dateTimeAdapter.now();
    const tomorrow = this.dateTimeAdapter.addCalendarDays(now, 1);
    return this.dateTimeAdapter.isSameDay(this.picker.selected, tomorrow);
  }

  get isNextWeek(): boolean {
    if (!this.picker.selected) {
      return false;
    }
    const now = Date.now();
    const tSelected = this.dateTimeAdapter.getTime(this.picker.selected);
    // NOTE: this won't work for december/january, but we're ok with that for now :D
    const weekDiff = getWeekNumber(tSelected) - getWeekNumber(now);
    return weekDiff === 1;
  }

  ngOnInit(): void {
    if (this.picker.selectMode === 'range') {
      // @ts-ignore
      if (this.picker.selecteds[0]) {
        // @ts-ignore
        this.retainStartTime = this.dateTimeAdapter.clone(this.picker.selecteds[0]);
      }
      // @ts-ignore
      if (this.picker.selecteds[1]) {
        // @ts-ignore
        this.retainEndTime = this.dateTimeAdapter.clone(this.picker.selecteds[1]);
      }
    }
  }

  ngAfterContentInit(): void {
    this.initPicker();
  }

  ngAfterViewInit(): void {
    this.focusPicker();
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  handleContainerAnimationDone(event: AnimationEvent): void {
    const toState = event.toState;
    if (toState === 'enter') {
      this.pickerOpened$.next();
    }
  }

  dateSelected(date: T): void {
    let result;

    if (this.picker.isInSingleMode) {
      result = this.dateSelectedInSingleMode(date);
      if (result) {
        if (this._isUserSetTime()) {
          this.pickerMoment = result;
          this.picker.select(result);
        } else {
          const split = this.picker.dayStartsAt.split(':');
          const d = this.dateTimeAdapter.createDate(
            this.dateTimeAdapter.getYear(result),
            this.dateTimeAdapter.getMonth(result),
            this.dateTimeAdapter.getDate(result),
            +split[0],
            +split[1],
            0,
          );
          this.pickerMoment = d;
          this.picker.select(d);
        }
      } else {
        // we close the picker when result is null and pickerType is calendar.
        if (this.pickerType === 'calendar') {
          this.hidePicker$.next(null);
        }
      }
      return;
    }

    if (this.picker.isInRangeMode) {
      result = this.dateSelectedInRangeMode(date);
      if (result) {
        this.pickerMoment = result[this.activeSelectedIndex];
        this.picker.select(result);
      }
    }
  }

  timeSelected(time: T): void {
    this.pickerMoment = this.dateTimeAdapter.clone(time);

    if (!this.picker.dateTimeChecker(this.pickerMoment)) {
      return;
    }

    if (this.picker.isInSingleMode) {
      this.picker.select(this.pickerMoment);
      return;
    }

    if (this.picker.isInRangeMode) {
      // @ts-ignore
      const selecteds = [...this.picker.selecteds];

      // check if the 'from' is after 'to' or 'to'is before 'from'
      // In this case, we set both the 'from' and 'to' the same value
      if (
        (this.activeSelectedIndex === 0 &&
          selecteds[1] &&
          this.dateTimeAdapter.compare(this.pickerMoment, selecteds[1]) === 1) ||
        (this.activeSelectedIndex === 1 &&
          selecteds[0] &&
          this.dateTimeAdapter.compare(this.pickerMoment, selecteds[0]) === -1)
      ) {
        selecteds[0] = this.pickerMoment;
        selecteds[1] = this.pickerMoment;
      } else {
        selecteds[this.activeSelectedIndex] = this.pickerMoment;
      }

      if (selecteds[0]) {
        this.retainStartTime = this.dateTimeAdapter.clone(selecteds[0]);
      }
      if (selecteds[1]) {
        this.retainEndTime = this.dateTimeAdapter.clone(selecteds[1]);
      }
      this.picker.select(selecteds);
    }
  }

  /**
   * Handle click on cancel button
   */
  onCancelClicked(event: any): void {
    this.hidePicker$.next(null);
    event.preventDefault();
    return;
  }

  /**
   * Handle click on set button
   */
  onSetClicked(event: any): void {
    if (!this.picker.dateTimeChecker(this.pickerMoment)) {
      this.hidePicker$.next(null);
      event.preventDefault();
      return;
    }

    this.confirmSelected$.next(event);
    event.preventDefault();
    return;
  }

  /**
   * Handle click on inform radio group
   */
  handleClickOnInfoGroup(event: any, index: number): void {
    this.setActiveSelectedIndex(index);
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle click on inform radio group
   */
  handleKeydownOnInfoGroup(event: any, next: any, index: number): void {
    switch (event.keyCode) {
      case DOWN_ARROW:
      case RIGHT_ARROW:
      case UP_ARROW:
      case LEFT_ARROW:
        next.focus();
        this.setActiveSelectedIndex(index === 0 ? 1 : 0);
        event.preventDefault();
        event.stopPropagation();
        break;

      case SPACE:
        this.setActiveSelectedIndex(index);
        event.preventDefault();
        event.stopPropagation();
        break;

      default:
        return;
    }
  }

  handleKeydown(event: any): void {
    const mp = this.elmRef.nativeElement;
    const tt: HTMLInputElement | HTMLButtonElement | HTMLTableCellElement = event.target;

    const isButtons = tt.classList.contains('owl-dt-schedule-item');
    const isTime = tt.classList.contains('owl-dt-timer-input');
    const isCalendarCell = tt.classList.contains('owl-dt-calendar-cell');
    const isCalendarDayCell = tt.classList.contains('owl-dt-day');

    if (event.keyCode === ENTER && (isButtons || isTime || isCalendarDayCell)) {
      if (tt === this._lastFocusEl) {
        this.picker.doubleEnter.emit();
      } else {
        this._triggerPopup$.next(true);
      }
      this._lastFocusEl = tt;
    } else {
      this._triggerPopup$.next(false);

      if (isButtons) {
        const t: HTMLButtonElement = tt as HTMLButtonElement;
        switch (event.keyCode) {
          case DOWN_ARROW: {
            if (t.nextSibling) {
              event.preventDefault();
              (t.nextSibling as HTMLButtonElement).focus();
            } else {
              const todayCell: HTMLTableCellElement = mp.querySelector(
                '.owl-dt-calendar-cell-active',
              );
              if (todayCell) {
                event.preventDefault();
                todayCell.focus();
              }
            }
            break;
          }
          case UP_ARROW: {
            if (t.previousSibling) {
              event.preventDefault();
              (t.previousSibling as HTMLButtonElement).focus();
            }
            break;
          }
          case RIGHT_ARROW: {
            const timerFirstInput: HTMLInputElement = mp.querySelector(
              'owl-date-time-timer-box:first-of-type input',
            ) as HTMLInputElement;
            this._lastBtn = t;
            if (timerFirstInput) {
              event.preventDefault();
              timerFirstInput.focus();
              timerFirstInput.setSelectionRange(0, timerFirstInput.value.length);
            }
            break;
          }
        }
      } else if (isTime) {
        const t: HTMLInputElement = tt as HTMLInputElement;
        switch (event.keyCode) {
          case LEFT_ARROW: {
            const timerFirstInput: HTMLInputElement =
              mp.querySelector('.owl-dt-timer-input');
            const timerSecondInput: HTMLInputElement = mp.querySelector(
              'owl-date-time-timer-box:last-of-type input',
            ) as HTMLInputElement;
            if (t === timerFirstInput) {
              if (this._lastBtn) {
                this._lastBtn.focus();
              } else {
                const firstBtn: HTMLElement = mp.querySelector('.owl-dt-schedule-item');
                firstBtn.focus();
              }
            } else if (t === timerSecondInput) {
              timerFirstInput.focus();
              // NOTE: needs timeout to work (probably because of keyboard event being fired on input)
              setTimeout(() => {
                timerFirstInput.setSelectionRange(0, timerFirstInput.value.length);
              });
            }
            break;
          }
          case RIGHT_ARROW: {
            const timerSecondInput: HTMLInputElement = mp.querySelector(
              'owl-date-time-timer-box:last-of-type input',
            ) as HTMLInputElement;
            if (timerSecondInput) {
              event.preventDefault();
              timerSecondInput.focus();
              timerSecondInput.setSelectionRange(0, timerSecondInput.value.length);
            }
            break;
          }
        }
      } else if (isCalendarCell) {
        const t: HTMLTableCellElement = tt as HTMLTableCellElement;
        switch (event.keyCode) {
          case UP_ARROW: {
            const todayCell: HTMLTableCellElement = mp.querySelector(
              '.owl-dt-calendar-cell-active',
            );
            if (t === todayCell) {
              const lastBtn: HTMLElement = mp.querySelector(
                '.owl-dt-schedule-item:last-of-type',
              );
              lastBtn.focus();
            }
            break;
          }
        }
      }
    }
  }

  setToLaterToday(): void {
    const closestToday = this._getClosestLaterToday();
    this.picker.select(closestToday);
    this.pickerMoment = closestToday;
    // NOTE: normally we would call this, but then time setting wouldn't work
    // this.dateSelected(closestToday);
  }

  setToNone(): void {
    // @ts-ignore
    this.picker.select(null);
  }

  setToTomorrow(): void {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this._updateDateForNextDayOrWeekButtons(tomorrow as any);
  }

  setToNextWeek(): void {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + 1);
    this._updateDateForNextDayOrWeekButtons(d as any);
  }

  private _getClosestLaterToday(): T {
    const now = this.dateTimeAdapter.now();
    const latestDate = this.picker.laterTodaySlots
      .map((slotStr) => {
        const split = slotStr.split(':');
        return this.dateTimeAdapter.createDate(
          this.dateTimeAdapter.getYear(now),
          this.dateTimeAdapter.getMonth(now),
          this.dateTimeAdapter.getDate(now),
          +split[0],
          +split[1],
          0,
        );
      })
      .find((slotDate: T) => {
        return (
          this.dateTimeAdapter.compare(slotDate, now) === 1 &&
          (slotDate as any).getTime() - (now as any).getTime() >
            this.picker.laterTodayMinMargin
        );
      });
    return latestDate || this.dateTimeAdapter.now();
  }

  /**
   * Set the value of activeSelectedIndex
   */
  private setActiveSelectedIndex(index: number): void {
    if (this.picker.selectMode === 'range' && this.activeSelectedIndex !== index) {
      this.activeSelectedIndex = index;

      // @ts-ignore
      const selected = this.picker.selecteds[this.activeSelectedIndex];
      if (this.picker.selecteds && selected) {
        this.pickerMoment = this.dateTimeAdapter.clone(selected);
      }
    }
    return;
  }

  private initPicker(): void {
    this.pickerMoment = this.picker.startAt || this.dateTimeAdapter.now();
    this.activeSelectedIndex = this.picker.selectMode === 'rangeTo' ? 1 : 0;
  }

  /**
   * Select calendar date in single mode,
   * it returns null when date is not selected.
   */
  private dateSelectedInSingleMode(date: T): T | null {
    // @ts-ignore
    if (this.dateTimeAdapter.isSameDay(date, this.picker.selected)) {
      return null;
    }

    return this.updateAndCheckCalendarDate(date);
  }

  /**
   * Select dates in range Mode
   */
  private dateSelectedInRangeMode(date: T): T[] | null {
    // @ts-ignore
    let from = this.picker.selecteds[0];
    // @ts-ignore
    let to = this.picker.selecteds[1];

    const result = this.updateAndCheckCalendarDate(date);

    if (!result) {
      return null;
    }

    // if the given calendar day is after or equal to 'from',
    // set ths given date as 'to'
    // otherwise, set it as 'from' and set 'to' to null
    if (this.picker.selectMode === 'range') {
      if (
        this.picker.selecteds &&
        this.picker.selecteds.length &&
        !to &&
        from &&
        this.dateTimeAdapter.differenceInCalendarDays(result, from) >= 0
      ) {
        if (this.picker.endAt && !this.retainEndTime) {
          to = this.dateTimeAdapter.createDate(
            this.dateTimeAdapter.getYear(result),
            this.dateTimeAdapter.getMonth(result),
            this.dateTimeAdapter.getDate(result),
            this.dateTimeAdapter.getHours(this.picker.endAt),
            this.dateTimeAdapter.getMinutes(this.picker.endAt),
            this.dateTimeAdapter.getSeconds(this.picker.endAt),
          );
        } else if (this.retainEndTime) {
          to = this.dateTimeAdapter.createDate(
            this.dateTimeAdapter.getYear(result),
            this.dateTimeAdapter.getMonth(result),
            this.dateTimeAdapter.getDate(result),
            this.dateTimeAdapter.getHours(this.retainEndTime),
            this.dateTimeAdapter.getMinutes(this.retainEndTime),
            this.dateTimeAdapter.getSeconds(this.retainEndTime),
          );
        } else {
          to = result;
        }
        this.activeSelectedIndex = 1;
      } else {
        if (this.picker.startAt && !this.retainStartTime) {
          from = this.dateTimeAdapter.createDate(
            this.dateTimeAdapter.getYear(result),
            this.dateTimeAdapter.getMonth(result),
            this.dateTimeAdapter.getDate(result),
            this.dateTimeAdapter.getHours(this.picker.startAt),
            this.dateTimeAdapter.getMinutes(this.picker.startAt),
            this.dateTimeAdapter.getSeconds(this.picker.startAt),
          );
        } else if (this.retainStartTime) {
          from = this.dateTimeAdapter.createDate(
            this.dateTimeAdapter.getYear(result),
            this.dateTimeAdapter.getMonth(result),
            this.dateTimeAdapter.getDate(result),
            this.dateTimeAdapter.getHours(this.retainStartTime),
            this.dateTimeAdapter.getMinutes(this.retainStartTime),
            this.dateTimeAdapter.getSeconds(this.retainStartTime),
          );
        } else {
          from = result;
        }
        // @ts-ignore
        to = null;
        this.activeSelectedIndex = 0;
      }
    } else if (this.picker.selectMode === 'rangeFrom') {
      from = result;

      // if the from value is after the to value, set the to value as null
      if (to && this.dateTimeAdapter.compare(from, to) > 0) {
        // @ts-ignore
        to = null;
      }
    } else if (this.picker.selectMode === 'rangeTo') {
      to = result;

      // if the from value is after the to value, set the from value as null
      if (from && this.dateTimeAdapter.compare(from, to) > 0) {
        // @ts-ignore
        from = null;
      }
    }

    return [from, to];
  }

  /**
   * Update the given calendar date's time and check if it is valid
   * Because the calendar date has 00:00:00 as default time, if the picker type is 'both',
   * we need to update the given calendar date's time before selecting it.
   * if it is valid, return the updated dateTime
   * if it is not valid, return null
   */
  private updateAndCheckCalendarDate(date: T): T {
    let result;

    // if the picker is 'both', update the calendar date's time value
    if (this.picker.pickerType === 'both') {
      result = this.dateTimeAdapter.createDate(
        this.dateTimeAdapter.getYear(date),
        this.dateTimeAdapter.getMonth(date),
        this.dateTimeAdapter.getDate(date),
        this.dateTimeAdapter.getHours(this.pickerMoment),
        this.dateTimeAdapter.getMinutes(this.pickerMoment),
        this.dateTimeAdapter.getSeconds(this.pickerMoment),
      );
      result = this.dateTimeAdapter.clampDate(
        result,
        this.picker.minDateTime,
        this.picker.maxDateTime,
      );
    } else {
      result = this.dateTimeAdapter.clone(date);
    }

    // check the updated dateTime
    return this.picker.dateTimeChecker(result) ? result : null;
  }

  /**
   * Focus to the picker
   * */
  private focusPicker(): void {
    if (this.picker.pickerMode === 'inline') {
      return;
    }

    if (this.calendar) {
      this.calendar.focusActiveCell();
    } else if (this.timer) {
      this.timer.focus();
    }
  }

  private _updateDateForNextDayOrWeekButtons(date: any): void {
    // if (this._isUserSetTime()) {
    //   this.dateSelected(date as any);
    // } else {
    const split = this.picker.dayStartsAt.split(':');

    const d = this.dateTimeAdapter.createDate(
      this.dateTimeAdapter.getYear(date),
      this.dateTimeAdapter.getMonth(date),
      this.dateTimeAdapter.getDate(date),
      +split[0],
      +split[1],
      0,
    );
    this.pickerMoment = d;
    this.dateSelected(d as any);
    // }
  }

  private _isUserSetTime(): boolean {
    if (!this.picker.selected) {
      return false;
    }

    const now = new Date();
    const d = new Date(this.picker.selected as any);

    now.setDate(1);
    now.setMonth(1);
    now.setFullYear(2000);

    d.setDate(1);
    d.setMonth(1);
    d.setFullYear(2000);

    const nowN = now.getTime();
    const dN = d.getTime();
    const m = 60 * 2000;
    return !this._isBetween(dN, nowN - m, nowN + m);
  }

  private _isBetween(x, min, max): boolean {
    // console.log(x, min, max);
    // console.log('min <= x', min <= x, x - min);
    // console.log('x <= max', x <= max, max - x);
    return min <= x && x <= max;
  }
}
