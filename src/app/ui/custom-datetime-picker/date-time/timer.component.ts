/**
 * timer.component
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  Optional,
  Output,
} from '@angular/core';
import { OwlDateTimeIntl } from './date-time-picker-intl.service';
import { DateTimeAdapter } from './adapter/date-time-adapter.class';
import { take } from 'rxjs/operators';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';

@Component({
  exportAs: 'owlDateTimeTimer',
  selector: 'owl-date-time-timer',
  templateUrl: './timer.component.html',
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-timer]': 'owlDTTimerClass',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[attr.tabindex]': 'owlDTTimeTabIndex',
  },
})
export class OwlTimerComponent<T> {
  /**
   * Whether to show the second's timer
   */
  @Input()
  showSecondsTimer!: boolean;
  /**
   * Whether the timer is in hour12 format
   */
  @Input()
  hour12Timer!: boolean;
  /**
   * Hours to change per step
   */
  @Input()
  stepHour = 1;
  /**
   * Minutes to change per step
   */
  @Input()
  stepMinute = 1;
  /**
   * Seconds to change per step
   */
  @Input()
  stepSecond = 1;
  @Output()
  selectedChange = new EventEmitter<T>();
  touchTimeValue!: string;

  IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;

  private isPM = false; // a flag indicates the current timer moment is in PM or AM

  constructor(
    private ngZone: NgZone,
    private elmRef: ElementRef,
    private pickerIntl: OwlDateTimeIntl,
    private cdRef: ChangeDetectorRef,
    // @ts-ignore
    @Optional() private dateTimeAdapter: DateTimeAdapter<T>,
  ) {}

  /** The current picker moment */
  private _pickerMoment!: T;

  @Input()
  get pickerMoment(): T {
    return this._pickerMoment;
  }

  set pickerMoment(value: T) {
    value = this.dateTimeAdapter.deserialize(value) as T;
    this._pickerMoment = this.getValidDate(value) || this.dateTimeAdapter.now();
    if (IS_TOUCH_PRIMARY) {
      const v = new Date(value as any);
      let hour: string | number = v.getHours();
      let min: string | number = v.getMinutes();
      hour = (hour < 10 ? '0' : '') + hour;
      min = (min < 10 ? '0' : '') + min;
      this.touchTimeValue = hour + ':' + min;
    }
  }

  /** The minimum selectable date time. */
  private _minDateTime!: T | null;

  @Input()
  get minDateTime(): T | null {
    return this._minDateTime;
  }

  set minDateTime(value: T | null) {
    value = this.dateTimeAdapter.deserialize(value);
    this._minDateTime = this.getValidDate(value);
  }

  /** The maximum selectable date time. */
  private _maxDateTime!: T | null;

  @Input()
  get maxDateTime(): T | null {
    return this._maxDateTime;
  }

  set maxDateTime(value: T | null) {
    value = this.dateTimeAdapter.deserialize(value);
    this._maxDateTime = this.getValidDate(value);
  }

  get hourValue(): number {
    return this.dateTimeAdapter.getHours(this.pickerMoment);
  }

  /**
   * The value would be displayed in hourBox.
   * We need this because the value displayed in hourBox it not
   * the same as the hourValue when the timer is in hour12Timer mode.
   * */
  get hourBoxValue(): number {
    let hours = this.hourValue;

    if (!this.hour12Timer) {
      return hours;
    } else {
      if (hours === 0) {
        hours = 12;
        this.isPM = false;
      } else if (hours > 0 && hours < 12) {
        this.isPM = false;
      } else if (hours === 12) {
        this.isPM = true;
      } else if (hours > 12 && hours < 24) {
        hours = hours - 12;
        this.isPM = true;
      }

      return hours;
    }
  }

  get minuteValue(): number {
    return this.dateTimeAdapter.getMinutes(this.pickerMoment);
  }

  get secondValue(): number {
    return this.dateTimeAdapter.getSeconds(this.pickerMoment);
  }

  get upHourButtonLabel(): string {
    return this.pickerIntl.upHourLabel;
  }

  get downHourButtonLabel(): string {
    return this.pickerIntl.downHourLabel;
  }

  get upMinuteButtonLabel(): string {
    return this.pickerIntl.upMinuteLabel;
  }

  get downMinuteButtonLabel(): string {
    return this.pickerIntl.downMinuteLabel;
  }

  get upSecondButtonLabel(): string {
    return this.pickerIntl.upSecondLabel;
  }

  get downSecondButtonLabel(): string {
    return this.pickerIntl.downSecondLabel;
  }

  get hour12ButtonLabel(): string {
    return this.isPM ? this.pickerIntl.hour12PMLabel : this.pickerIntl.hour12AMLabel;
  }

  get owlDTTimerClass(): boolean {
    return true;
  }

  get owlDTTimeTabIndex(): number {
    return -1;
  }

  onTouchTimeChange($event): void {
    const inpDate = $event.target.value as string;
    if (!inpDate) {
      return;
    }
    const split = inpDate.split(':');
    const h = +split[0];
    const m = +split[1];
    const s = +split[2];
    const updatedDate = this.dateTimeAdapter.createDate(
      this.dateTimeAdapter.getYear(this._pickerMoment),
      this.dateTimeAdapter.getMonth(this._pickerMoment),
      this.dateTimeAdapter.getDate(this._pickerMoment),
      h,
      m,
      s || 0,
    );

    this.selectedChange.emit(updatedDate);
  }

  /**
   * Focus to the host element
   * */
  focus(): void {
    this.ngZone.runOutsideAngular(() => {
      this.ngZone.onStable
        .asObservable()
        .pipe(take(1))
        .subscribe(() => {
          this.elmRef.nativeElement.focus();
        });
    });
  }

  /**
   * Set the hour value via typing into timer box input
   * We need this to handle the hour value when the timer is in hour12 mode
   * */
  setHourValueViaInput(hours: number): void {
    if (this.hour12Timer && this.isPM && hours >= 1 && hours <= 11) {
      hours = hours + 12;
    } else if (this.hour12Timer && !this.isPM && hours === 12) {
      hours = 0;
    }

    this.setHourValue(hours);
  }

  setHourValue(hours: number): void {
    const m = this.dateTimeAdapter.setHours(this.pickerMoment, hours);
    this.selectedChange.emit(m);
    this.cdRef.markForCheck();
  }

  setMinuteValue(minutes: number): void {
    const m = this.dateTimeAdapter.setMinutes(this.pickerMoment, minutes);
    this.selectedChange.emit(m);
    this.cdRef.markForCheck();
  }

  setSecondValue(seconds: number): void {
    const m = this.dateTimeAdapter.setSeconds(this.pickerMoment, seconds);
    this.selectedChange.emit(m);
    this.cdRef.markForCheck();
  }

  setMeridiem(event: any): void {
    this.isPM = !this.isPM;

    let hours = this.hourValue;
    if (this.isPM) {
      hours = hours + 12;
    } else {
      hours = hours - 12;
    }

    if (hours >= 0 && hours <= 23) {
      this.setHourValue(hours);
    }

    this.cdRef.markForCheck();
    event.preventDefault();
  }

  /**
   * Check if the up hour button is enabled
   */
  upHourEnabled(): boolean {
    return !this.maxDateTime || this.compareHours(this.stepHour, this.maxDateTime) < 1;
  }

  /**
   * Check if the down hour button is enabled
   */
  downHourEnabled(): boolean {
    return !this.minDateTime || this.compareHours(-this.stepHour, this.minDateTime) > -1;
  }

  /**
   * Check if the up minute button is enabled
   */
  upMinuteEnabled(): boolean {
    return (
      !this.maxDateTime || this.compareMinutes(this.stepMinute, this.maxDateTime) < 1
    );
  }

  /**
   * Check if the down minute button is enabled
   */
  downMinuteEnabled(): boolean {
    return (
      !this.minDateTime || this.compareMinutes(-this.stepMinute, this.minDateTime) > -1
    );
  }

  /**
   * Check if the up second button is enabled
   */
  upSecondEnabled(): boolean {
    return (
      !this.maxDateTime || this.compareSeconds(this.stepSecond, this.maxDateTime) < 1
    );
  }

  /**
   * Check if the down second button is enabled
   */
  downSecondEnabled(): boolean {
    return (
      !this.minDateTime || this.compareSeconds(-this.stepSecond, this.minDateTime) > -1
    );
  }

  /**
   * PickerMoment's hour value +/- certain amount and compare it to the give date
   * 1 is after the comparedDate
   * -1 is before the comparedDate
   * 0 is equal the comparedDate
   * */
  private compareHours(amount: number, comparedDate: T): number {
    const hours = this.dateTimeAdapter.getHours(this.pickerMoment) + amount;
    const result = this.dateTimeAdapter.setHours(this.pickerMoment, hours);
    return this.dateTimeAdapter.compare(result, comparedDate);
  }

  /**
   * PickerMoment's minute value +/- certain amount and compare it to the give date
   * 1 is after the comparedDate
   * -1 is before the comparedDate
   * 0 is equal the comparedDate
   * */
  private compareMinutes(amount: number, comparedDate: T): number {
    const minutes = this.dateTimeAdapter.getMinutes(this.pickerMoment) + amount;
    const result = this.dateTimeAdapter.setMinutes(this.pickerMoment, minutes);
    return this.dateTimeAdapter.compare(result, comparedDate);
  }

  /**
   * PickerMoment's second value +/- certain amount and compare it to the give date
   * 1 is after the comparedDate
   * -1 is before the comparedDate
   * 0 is equal the comparedDate
   * */
  private compareSeconds(amount: number, comparedDate: T): number {
    const seconds = this.dateTimeAdapter.getSeconds(this.pickerMoment) + amount;
    const result = this.dateTimeAdapter.setSeconds(this.pickerMoment, seconds);
    return this.dateTimeAdapter.compare(result, comparedDate);
  }

  /**
   * Get a valid date object
   */
  private getValidDate(obj: any): T | null {
    return this.dateTimeAdapter.isDateInstance(obj) && this.dateTimeAdapter.isValid(obj)
      ? obj
      : null;
  }
}
