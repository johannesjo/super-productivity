/**
 * calendar-year-view.component
 */

import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CalendarCell, OwlCalendarBodyComponent } from './calendar-body.component';
import { DateTimeAdapter } from './adapter/date-time-adapter.class';
import {
  OWL_DATE_TIME_FORMATS,
  OwlDateTimeFormats,
} from './adapter/date-time-format.class';
import { Subscription } from 'rxjs';
import { SelectMode } from './date-time.class';
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

const MONTHS_PER_YEAR = 12;
const MONTHS_PER_ROW = 3;

@Component({
  selector: 'owl-date-time-year-view',
  exportAs: 'owlMonthView',
  templateUrl: './calendar-year-view.component.html',
  styleUrls: ['./calendar-year-view.component.scss'],
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-calendar-view]': 'owlDTCalendarView',
  },
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwlYearViewComponent<T> implements OnInit, AfterContentInit, OnDestroy {
  todayMonth!: number | null;
  /**
   * An array to hold all selectedDates' month value
   * the value is the month number in current year
   * */
  selectedMonths: number[] = [];
  /**
   * Callback to invoke when a new month is selected
   * */
  @Output()
  // eslint-disable-next-line @angular-eslint/no-output-native
  readonly change = new EventEmitter<T>();
  /**
   * Emits the selected year. This doesn't imply a change on the selected date
   * */
  @Output()
  readonly monthSelected = new EventEmitter<T>();
  /** Emits when any date is activated. */
  @Output()
  readonly pickerMomentChange: EventEmitter<T> = new EventEmitter<T>();
  /** Emits when use keyboard enter to select a calendar cell */
  @Output()
  readonly keyboardEnter: EventEmitter<any> = new EventEmitter<any>();
  /** The body of calendar table */
  @ViewChild(OwlCalendarBodyComponent, { static: true })
  calendarBodyElm!: OwlCalendarBodyComponent;
  private readonly monthNames: string[];
  private localeSub: Subscription = Subscription.EMPTY;
  private initiated = false;

  constructor(
    private cdRef: ChangeDetectorRef,
    // TODO check
    // @Optional()
    private dateTimeAdapter: DateTimeAdapter<T>,
    // TODO check
    // @Optional()
    // @ts-ignore
    @Inject(OWL_DATE_TIME_FORMATS)
    private dateTimeFormats: OwlDateTimeFormats,
  ) {
    this.monthNames = this.dateTimeAdapter.getMonthNames('short');
  }

  /**
   * The select mode of the picker;
   * */
  private _selectMode: SelectMode = 'single';

  @Input()
  get selectMode(): SelectMode {
    return this._selectMode;
  }

  set selectMode(val: SelectMode) {
    this._selectMode = val;
    if (this.initiated) {
      this.generateMonthList();
      this.cdRef.markForCheck();
    }
  }

  /** The currently selected date. */
  private _selected!: T | null;

  @Input()
  get selected(): T | null {
    return this._selected;
  }

  set selected(value: T | null) {
    value = this.dateTimeAdapter.deserialize(value);
    this._selected = this.getValidDate(value);
    this.setSelectedMonths();
  }

  private _selecteds: T[] = [];

  @Input()
  get selecteds(): T[] {
    return this._selecteds;
  }

  set selecteds(values: T[]) {
    this._selecteds = [];
    for (let i = 0; i < values.length; i++) {
      const value = this.dateTimeAdapter.deserialize(values[i]);
      // @ts-ignore
      this._selecteds.push(this.getValidDate(value));
    }

    this.setSelectedMonths();
  }

  private _pickerMoment!: T;

  @Input()
  get pickerMoment(): T {
    return this._pickerMoment;
  }

  set pickerMoment(value: T) {
    const oldMoment = this._pickerMoment;
    // @ts-ignore
    value = this.dateTimeAdapter.deserialize(value);
    this._pickerMoment = this.getValidDate(value) || this.dateTimeAdapter.now();

    // @ts-ignore
    if (!this.hasSameYear(oldMoment, this._pickerMoment) && this.initiated) {
      this.generateMonthList();
    }
  }

  /**
   * A function used to filter which dates are selectable
   * */
  private _dateFilter!: (date: T) => boolean;

  @Input()
  get dateFilter(): (date: T) => boolean {
    return this._dateFilter;
  }

  set dateFilter(filter: (date: T) => boolean) {
    this._dateFilter = filter;
    if (this.initiated) {
      this.generateMonthList();
    }
  }

  /** The minimum selectable date. */
  private _minDate!: T | null;

  @Input()
  get minDate(): T | null {
    return this._minDate;
  }

  set minDate(value: T | null) {
    value = this.dateTimeAdapter.deserialize(value);
    this._minDate = this.getValidDate(value);
    if (this.initiated) {
      this.generateMonthList();
    }
  }

  /** The maximum selectable date. */
  private _maxDate!: T | null;

  @Input()
  get maxDate(): T | null {
    return this._maxDate;
  }

  set maxDate(value: T | null) {
    value = this.dateTimeAdapter.deserialize(value);
    this._maxDate = this.getValidDate(value);
    if (this.initiated) {
      this.generateMonthList();
    }
  }

  private _months!: CalendarCell[][];

  get months(): CalendarCell[][] {
    return this._months;
  }

  // @ts-ignore
  get activeCell(): number {
    if (this._pickerMoment) {
      return this.dateTimeAdapter.getMonth(this._pickerMoment);
    }
  }

  get isInSingleMode(): boolean {
    return this.selectMode === 'single';
  }

  get isInRangeMode(): boolean {
    return (
      this.selectMode === 'range' ||
      this.selectMode === 'rangeFrom' ||
      this.selectMode === 'rangeTo'
    );
  }

  get owlDTCalendarView(): boolean {
    return true;
  }

  ngOnInit(): void {
    this.localeSub = this.dateTimeAdapter.localeChanges.subscribe(() => {
      this.generateMonthList();
      this.cdRef.markForCheck();
    });
  }

  ngAfterContentInit(): void {
    this.generateMonthList();
    this.initiated = true;
  }

  ngOnDestroy(): void {
    this.localeSub.unsubscribe();
  }

  /**
   * Handle a calendarCell selected
   */
  selectCalendarCell(cell: CalendarCell): void {
    this.selectMonth(cell.value);
  }

  /**
   * Handle keydown event on calendar body
   */
  handleCalendarKeydown(event: KeyboardEvent): void {
    let moment;
    switch (event.keyCode) {
      // minus 1 month
      case LEFT_ARROW:
        // @ts-ignore
        moment = this.dateTimeAdapter.addCalendarMonths(this.pickerMoment, -1);
        this.pickerMomentChange.emit(moment);
        break;

      // add 1 month
      case RIGHT_ARROW:
        // @ts-ignore
        moment = this.dateTimeAdapter.addCalendarMonths(this.pickerMoment, 1);
        this.pickerMomentChange.emit(moment);
        break;

      // minus 3 months
      case UP_ARROW:
        // @ts-ignore
        moment = this.dateTimeAdapter.addCalendarMonths(this.pickerMoment, -3);
        this.pickerMomentChange.emit(moment);
        break;

      // add 3 months
      case DOWN_ARROW:
        // @ts-ignore
        moment = this.dateTimeAdapter.addCalendarMonths(this.pickerMoment, 3);
        this.pickerMomentChange.emit(moment);
        break;

      // move to first month of current year
      case HOME:
        // @ts-ignore
        // @ts-ignore
        // @ts-ignore
        // @ts-ignore
        // @ts-ignore
        // @ts-ignore
        // @ts-ignore
        // @ts-ignore
        // @ts-ignore
        // @ts-ignore
        moment = this.dateTimeAdapter.addCalendarMonths(
          this.pickerMoment,
          -this.dateTimeAdapter.getMonth(this.pickerMoment),
        );
        this.pickerMomentChange.emit(moment);
        break;

      // move to last month of current year
      case END:
        moment = this.dateTimeAdapter.addCalendarMonths(
          this.pickerMoment,
          11 - this.dateTimeAdapter.getMonth(this.pickerMoment),
        );
        this.pickerMomentChange.emit(moment);
        break;

      // minus 1 year (or 10 year)
      case PAGE_UP:
        moment = this.dateTimeAdapter.addCalendarYears(
          this.pickerMoment,
          event.altKey ? -10 : -1,
        );
        this.pickerMomentChange.emit(moment);
        break;

      // add 1 year (or 10 year)
      case PAGE_DOWN:
        moment = this.dateTimeAdapter.addCalendarYears(
          this.pickerMoment,
          event.altKey ? 10 : 1,
        );
        this.pickerMomentChange.emit(moment);
        break;

      // Select current month
      case ENTER:
        this.selectMonth(this.dateTimeAdapter.getMonth(this.pickerMoment));
        this.keyboardEnter.emit();
        break;
      default:
        return;
    }

    this.focusActiveCell();
    event.preventDefault();
  }

  /**
   * Handle a new month selected
   */
  private selectMonth(month: number): void {
    const firstDateOfMonth = this.dateTimeAdapter.createDate(
      this.dateTimeAdapter.getYear(this.pickerMoment),
      month,
      1,
    );

    this.monthSelected.emit(firstDateOfMonth);

    const daysInMonth = this.dateTimeAdapter.getNumDaysInMonth(firstDateOfMonth);
    const result = this.dateTimeAdapter.createDate(
      this.dateTimeAdapter.getYear(this.pickerMoment),
      month,
      Math.min(daysInMonth, this.dateTimeAdapter.getDate(this.pickerMoment)),
      this.dateTimeAdapter.getHours(this.pickerMoment),
      this.dateTimeAdapter.getMinutes(this.pickerMoment),
      this.dateTimeAdapter.getSeconds(this.pickerMoment),
    );

    this.change.emit(result);
  }

  /**
   * Generate the calendar month list
   * */
  private generateMonthList(): void {
    if (!this.pickerMoment) {
      return;
    }

    this.setSelectedMonths();
    this.todayMonth = this.getMonthInCurrentYear(this.dateTimeAdapter.now());

    this._months = [];
    for (let i = 0; i < MONTHS_PER_YEAR / MONTHS_PER_ROW; i++) {
      const row = [];

      for (let j = 0; j < MONTHS_PER_ROW; j++) {
        // eslint-disable-next-line no-mixed-operators
        const month = j + i * MONTHS_PER_ROW;
        const monthCell = this.createMonthCell(month);
        // @ts-ignore
        row.push(monthCell);
      }

      this._months.push(row);
    }

    return;
  }

  /**
   * Creates an CalendarCell for the given month.
   */
  private createMonthCell(month: number): CalendarCell {
    const startDateOfMonth = this.dateTimeAdapter.createDate(
      this.dateTimeAdapter.getYear(this.pickerMoment),
      month,
      1,
    );
    const ariaLabel = this.dateTimeAdapter.format(
      startDateOfMonth,
      this.dateTimeFormats.monthYearA11yLabel,
    );
    const cellClass = 'owl-dt-month-' + month;
    return new CalendarCell(
      month,
      this.monthNames[month],
      ariaLabel,
      this.isMonthEnabled(month),
      false,
      cellClass,
    );
  }

  /**
   * Check if the given month is enable
   */
  private isMonthEnabled(month: number): boolean {
    const firstDateOfMonth = this.dateTimeAdapter.createDate(
      this.dateTimeAdapter.getYear(this.pickerMoment),
      month,
      1,
    );

    // If any date in the month is selectable,
    // we count the month as enable
    for (
      let date = firstDateOfMonth;
      this.dateTimeAdapter.getMonth(date) === month;
      date = this.dateTimeAdapter.addCalendarDays(date, 1)
    ) {
      if (
        !!date &&
        (!this.dateFilter || this.dateFilter(date)) &&
        (!this.minDate || this.dateTimeAdapter.compare(date, this.minDate) >= 0) &&
        (!this.maxDate || this.dateTimeAdapter.compare(date, this.maxDate) <= 0)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gets the month in this year that the given Date falls on.
   * Returns null if the given Date is in another year.
   */
  private getMonthInCurrentYear(date: T | null): number {
    if (this.getValidDate(date) && this.getValidDate(this._pickerMoment)) {
      // @ts-ignore
      const result = this.dateTimeAdapter.compareYear(date, this._pickerMoment);

      // < 0 : the given date's year is before pickerMoment's year, we return -1 as selected month value.
      // > 0 : the given date's year is after pickerMoment's year, we return 12 as selected month value.
      // 0 : the give date's year is same as the pickerMoment's year, we return the actual month value.
      if (result < 0) {
        return -1;
      } else if (result > 0) {
        return 12;
      } else {
        // @ts-ignore
        return this.dateTimeAdapter.getMonth(date);
      }
    } else {
      // @ts-ignore
      return null;
    }
  }

  /**
   * Set the selectedMonths value
   * In single mode, it has only one value which represent the month the selected date in
   * In range mode, it would has two values, one for the month the fromValue in and the other for the month the toValue in
   * */
  private setSelectedMonths(): void {
    this.selectedMonths = [];
    if (this.isInSingleMode && this.selected) {
      this.selectedMonths[0] = this.getMonthInCurrentYear(this.selected);
    }

    if (this.isInRangeMode && this.selecteds) {
      this.selectedMonths[0] = this.getMonthInCurrentYear(this.selecteds[0]);
      this.selectedMonths[1] = this.getMonthInCurrentYear(this.selecteds[1]);
    }
  }

  /**
   * Check the given dates are in the same year
   */
  private hasSameYear(dateLeft: T, dateRight: T): boolean {
    return !!(
      dateLeft &&
      dateRight &&
      this.dateTimeAdapter.getYear(dateLeft) === this.dateTimeAdapter.getYear(dateRight)
    );
  }

  /**
   * Get a valid date object
   */
  private getValidDate(obj: any): T | null {
    return this.dateTimeAdapter.isDateInstance(obj) && this.dateTimeAdapter.isValid(obj)
      ? obj
      : null;
  }

  private focusActiveCell(): void {
    this.calendarBodyElm.focusActiveCell();
  }
}
