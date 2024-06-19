/**
 * timer-box.component
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  exportAs: 'owlDateTimeTimerBox',
  selector: 'owl-date-time-timer-box',
  templateUrl: './timer-box.component.html',
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-timer-box]': 'owlDTTimerBoxClass',
  },
})
export class OwlTimerBoxComponent implements OnInit, OnDestroy {
  @Input() showDivider = false;

  @Input()
  upBtnAriaLabel!: string;

  @Input()
  upBtnDisabled!: boolean;

  @Input()
  downBtnAriaLabel!: string;

  @Input()
  downBtnDisabled!: boolean;

  /**
   * Value would be displayed in the box
   * If it is null, the box would display [value]
   * */
  @Input()
  boxValue!: number;

  @Input()
  value!: number;

  @Input()
  min!: number;

  @Input()
  max!: number;

  @Input() step = 1;

  @Input()
  inputLabel!: string;

  @Output() valueChange = new EventEmitter<number>();

  @Output() inputChange = new EventEmitter<number>();

  private inputStream = new Subject<string>();

  private inputStreamSub = Subscription.EMPTY;
  @ViewChild('valueInput', { static: true })
  private valueInput!: ElementRef;
  private onValueInputMouseWheelBind = this.onValueInputMouseWheel.bind(this);

  constructor() {}

  get displayValue(): number {
    return this.boxValue || this.value;
  }

  get owlDTTimerBoxClass(): boolean {
    return true;
  }

  ngOnInit(): void {
    this.inputStreamSub = this.inputStream
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((val: string) => {
        if (val) {
          const inputValue = coerceNumberProperty(val, 0);
          this.updateValueViaInput(inputValue);
        }
      });
    this.bindValueInputMouseWheel();
  }

  ngOnDestroy(): void {
    this.unbindValueInputMouseWheel();
    this.inputStreamSub.unsubscribe();
  }

  upBtnClicked(): void {
    this.updateValue(this.value + this.step);
  }

  downBtnClicked(): void {
    this.updateValue(this.value - this.step);
  }

  handleInputChange(val: string): void {
    this.inputStream.next(val);
  }

  private updateValue(value: number): void {
    this.valueChange.emit(value);
  }

  private updateValueViaInput(value: number): void {
    if (value > this.max || value < this.min) {
      return;
    }
    this.inputChange.emit(value);
  }

  private onValueInputMouseWheel(event: any): void {
    event = event || window.event;
    const delta = event.wheelDelta || -event.deltaY || -event.detail;

    if (delta > 0) {
      if (!this.upBtnDisabled) {
        this.upBtnClicked();
      }
    } else if (delta < 0) {
      if (!this.downBtnDisabled) {
        this.downBtnClicked();
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    event.preventDefault ? event.preventDefault() : (event.returnValue = false);
  }

  private bindValueInputMouseWheel(): void {
    this.valueInput.nativeElement.addEventListener(
      'onwheel' in document ? 'wheel' : 'mousewheel',
      this.onValueInputMouseWheelBind,
    );
  }

  private unbindValueInputMouseWheel(): void {
    this.valueInput.nativeElement.removeEventListener(
      'onwheel' in document ? 'wheel' : 'mousewheel',
      this.onValueInputMouseWheelBind,
    );
  }
}
