import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {SimpleCounter, SimpleCounterType} from '../simple-counter.model';
import {SimpleCounterService} from '../simple-counter.service';
import {MatDialog} from '@angular/material/dialog';
import {DialogSimpleCounterEditComponent} from '../dialog-simple-counter-edit/dialog-simple-counter-edit.component';
import {T} from 'src/app/t.const';
import {getWorklogStr} from '../../../util/get-work-log-str';

@Component({
  selector: 'simple-counter-button',
  templateUrl: './simple-counter-button.component.html',
  styleUrls: ['./simple-counter-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleCounterButtonComponent {
  T = T;
  SimpleCounterType = SimpleCounterType;
  todayStr = getWorklogStr();

  @Input() simpleCounter: SimpleCounter;

  constructor(
    private _simpleCounterService: SimpleCounterService,
    private _matDialog: MatDialog,
  ) {
  }

  toggleStopwatch() {
    this._simpleCounterService.toggleCounter(this.simpleCounter.id);
  }

  toggleCounter() {
    this._simpleCounterService.increaseCounterToday(this.simpleCounter.id, 1);
  }

  reset() {
    this._simpleCounterService.setCounterToday(this.simpleCounter.id, 0);
  }

  edit(ev?) {
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
