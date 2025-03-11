import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
} from '@angular/core';
import { SimpleCounterCopy } from '../../../features/simple-counter/simple-counter.model';
import { MatIcon } from '@angular/material/icon';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { DialogSimpleCounterEditComponent } from '../../../features/simple-counter/dialog-simple-counter-edit/dialog-simple-counter-edit.component';
import { MatDialog } from '@angular/material/dialog';

export interface SimpleCounterSummaryItem extends SimpleCounterCopy {
  streakDuration: number;
}

@Component({
  selector: 'simple-counter-summary-item',
  standalone: true,
  imports: [MatIcon, MsToStringPipe],
  templateUrl: './simple-counter-summary-item.component.html',
  styleUrl: './simple-counter-summary-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleCounterSummaryItemComponent {
  private _matDialog = inject(MatDialog);

  simpleCounter = input.required<SimpleCounterSummaryItem>();
  dayStr = input.required<string>();

  @HostListener('click') clickHandler(): void {
    const c = this.simpleCounter();
    if (!c) {
      throw new Error('No simple counter model');
    }

    this._matDialog.open(DialogSimpleCounterEditComponent, {
      restoreFocus: true,
      data: {
        simpleCounter: c,
      },
    });
  }
}
