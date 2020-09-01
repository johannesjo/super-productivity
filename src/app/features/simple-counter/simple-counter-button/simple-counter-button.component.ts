import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SimpleCounter, SimpleCounterType } from '../simple-counter.model';
import { SimpleCounterService } from '../simple-counter.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogSimpleCounterEditComponent } from '../dialog-simple-counter-edit/dialog-simple-counter-edit.component';
import { T } from 'src/app/t.const';
import { getWorklogStr } from '../../../util/get-work-log-str';

@Component({
  selector: 'simple-counter-button',
  templateUrl: './simple-counter-button.component.html',
  styleUrls: ['./simple-counter-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleCounterButtonComponent {
  T: typeof T = T;
  SimpleCounterType: typeof SimpleCounterType = SimpleCounterType;
  todayStr: string = getWorklogStr();

  @Input() simpleCounter?: SimpleCounter;

  constructor(
    private _simpleCounterService: SimpleCounterService,
    private _matDialog: MatDialog,
  ) {
  }

  toggleStopwatch() {
    if (!this.simpleCounter) {
      throw new Error('No simple counter model');
    }
    this._simpleCounterService.toggleCounter(this.simpleCounter.id);
  }

  toggleCounter() {
    if (!this.simpleCounter) {
      throw new Error('No simple counter model');
    }
    this._simpleCounterService.increaseCounterToday(this.simpleCounter.id, 1);
  }

  reset() {
    if (!this.simpleCounter) {
      throw new Error('No simple counter model');
    }
    this._simpleCounterService.setCounterToday(this.simpleCounter.id, 0);
  }

  edit(ev?: Event) {
    if (ev) {
      ev.preventDefault();
    }

    this._matDialog.open(DialogSimpleCounterEditComponent, {
      restoreFocus: true,
      data: {
        simpleCounter: this.simpleCounter
      },
    });
  }
}
