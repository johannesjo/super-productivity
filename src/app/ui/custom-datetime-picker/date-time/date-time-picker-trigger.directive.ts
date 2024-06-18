/**
 * date-time-picker-trigger.directive
 */

import {
  AfterContentInit,
  ChangeDetectorRef,
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { OwlDateTimeComponent } from './date-time-picker.component';
import { merge, of as observableOf, Subscription } from 'rxjs';

@Directive({
  selector: '[owlDateTimeTrigger]',
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '(click)': 'handleClickOnHost($event)',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-trigger-disabled]': 'owlDTTriggerDisabledClass',
  },
})
export class OwlDateTimeTriggerDirective<T>
  implements OnChanges, AfterContentInit, OnDestroy
{
  @Input('owlDateTimeTrigger')
  dtPicker!: OwlDateTimeComponent<T>;
  private stateChanges = Subscription.EMPTY;

  constructor(protected changeDetector: ChangeDetectorRef) {}

  private _disabled!: boolean;

  @Input()
  get disabled(): boolean {
    return this._disabled === undefined ? this.dtPicker.disabled : !!this._disabled;
  }

  set disabled(value: boolean) {
    this._disabled = value;
  }

  get owlDTTriggerDisabledClass(): boolean {
    return this.disabled;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.datepicker) {
      this.watchStateChanges();
    }
  }

  ngAfterContentInit(): void {
    this.watchStateChanges();
  }

  ngOnDestroy(): void {
    this.stateChanges.unsubscribe();
  }

  handleClickOnHost(event: Event): void {
    if (this.dtPicker) {
      this.dtPicker.open();
      event.stopPropagation();
    }
  }

  private watchStateChanges(): void {
    this.stateChanges.unsubscribe();

    const inputDisabled =
      this.dtPicker && this.dtPicker.dtInput
        ? this.dtPicker.dtInput.disabledChange
        : observableOf();

    const pickerDisabled = this.dtPicker ? this.dtPicker.disabledChange : observableOf();

    this.stateChanges = merge(pickerDisabled, inputDisabled).subscribe(() => {
      this.changeDetector.markForCheck();
    });
  }
}
