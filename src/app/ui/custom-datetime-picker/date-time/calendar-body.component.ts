/**
 * calendar-body.component
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  Output,
} from '@angular/core';
import { SelectMode } from './date-time.class';
import { take } from 'rxjs/operators';

export class CalendarCell {
  constructor(
    public value: number,
    public displayValue: string,
    public ariaLabel: string,
    public enabled: boolean,
    public out: boolean = false,
    public cellClass: string = '',
  ) {}
}

@Component({
  selector: '[owl-date-time-calendar-body]',
  exportAs: 'owlDateTimeCalendarBody',
  templateUrl: './calendar-body.component.html',
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-calendar-body]': 'owlDTCalendarBodyClass',
  },
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwlCalendarBodyComponent {
  @Input()
  isNoMonthSquares!: boolean;

  /**
   * The cell number of the active cell in the table.
   */
  @Input()
  activeCell = 0;

  /**
   * The cells to display in the table.
   * */
  @Input()
  rows!: CalendarCell[][];

  /**
   * The number of columns in the table.
   * */
  @Input()
  numCols = 7;

  /**
   * The ratio (width / height) to use for the cells in the table.
   */
  @Input()
  cellRatio = 1;

  /**
   * The value in the table that corresponds to today.
   * */
  @Input()
  todayValue!: number;

  /**
   * The value in the table that is currently selected.
   * */
  @Input()
  selectedValues!: number[];

  /**
   * Current picker select mode
   */
  @Input()
  selectMode!: SelectMode;

  /**
   * Emit when a calendar cell is selected
   * */
  @Output()
  // eslint-disable-next-line @angular-eslint/no-output-native
  readonly select = new EventEmitter<CalendarCell>();

  constructor(
    private elmRef: ElementRef,
    private ngZone: NgZone,
  ) {}

  get owlDTCalendarBodyClass(): boolean {
    return true;
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

  selectCell(cell: CalendarCell): void {
    this.select.emit(cell);
  }

  isActiveCell(rowIndex: number, colIndex: number): boolean {
    // eslint-disable-next-line no-mixed-operators
    const cellNumber = rowIndex * this.numCols + colIndex;
    return cellNumber === this.activeCell;
  }

  /**
   * Check if the cell is selected
   */
  isSelected(value: number): boolean {
    if (!this.selectedValues || this.selectedValues.length === 0) {
      return false;
    }

    if (this.isInSingleMode) {
      return value === this.selectedValues[0];
    }

    if (this.isInRangeMode) {
      const fromValue = this.selectedValues[0];
      const toValue = this.selectedValues[1];

      return value === fromValue || value === toValue;
    }
    return false;
  }

  /**
   * Check if the cell in the range
   * */
  isInRange(value: number): boolean {
    if (this.isInRangeMode) {
      const fromValue = this.selectedValues[0];
      const toValue = this.selectedValues[1];

      if (fromValue !== null && toValue !== null) {
        return value >= fromValue && value <= toValue;
      } else {
        return value === fromValue || value === toValue;
      }
    }
    return false;
  }

  /**
   * Check if the cell is the range from
   * */
  isRangeFrom(value: number): boolean {
    if (this.isInRangeMode) {
      const fromValue = this.selectedValues[0];
      return fromValue !== null && value === fromValue;
    }
    return false;
  }

  /**
   * Check if the cell is the range to
   * */
  isRangeTo(value: number): boolean {
    if (this.isInRangeMode) {
      const toValue = this.selectedValues[1];
      return toValue !== null && value === toValue;
    }
    return false;
  }

  /**
   * Focus to a active cell
   * */
  focusActiveCell(): void {
    this.ngZone.runOutsideAngular(() => {
      this.ngZone.onStable
        .asObservable()
        .pipe(take(1))
        .subscribe(() => {
          this.elmRef.nativeElement.querySelector('.owl-dt-calendar-cell-active').focus();
        });
    });
  }
}
