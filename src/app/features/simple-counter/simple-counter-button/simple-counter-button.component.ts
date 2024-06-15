import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { SimpleCounter, SimpleCounterType } from '../simple-counter.model';
import { SimpleCounterService } from '../simple-counter.service';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogSimpleCounterEditComponent } from '../dialog-simple-counter-edit/dialog-simple-counter-edit.component';
import { T } from 'src/app/t.const';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { Subscription } from 'rxjs';
import { DateService } from 'src/app/core/date/date.service';

@Component({
  selector: 'simple-counter-button',
  templateUrl: './simple-counter-button.component.html',
  styleUrls: ['./simple-counter-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleCounterButtonComponent implements OnDestroy, OnInit {
  T: typeof T = T;
  SimpleCounterType: typeof SimpleCounterType = SimpleCounterType;
  todayStr: string = this._dateService.todayStr();

  @Input() simpleCounter?: SimpleCounter;

  private _todayStr$ = this._globalTrackingIntervalService.todayDateStr$;
  private _subs = new Subscription();

  constructor(
    private _simpleCounterService: SimpleCounterService,
    private _matDialog: MatDialog,
    private _globalTrackingIntervalService: GlobalTrackingIntervalService,
    private _dateService: DateService,
    private _cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._todayStr$.subscribe((todayStr) => {
        this.todayStr = todayStr;
        this._cd.detectChanges();
      }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  toggleStopwatch(): void {
    if (!this.simpleCounter) {
      throw new Error('No simple counter model');
    }
    this._simpleCounterService.toggleCounter(this.simpleCounter.id);
  }

  toggleCounter(): void {
    if (!this.simpleCounter) {
      throw new Error('No simple counter model');
    }
    this._simpleCounterService.increaseCounterToday(this.simpleCounter.id, 1);
  }

  reset(): void {
    if (!this.simpleCounter) {
      throw new Error('No simple counter model');
    }
    this._simpleCounterService.setCounterToday(this.simpleCounter.id, 0);
  }

  edit(ev?: Event): void {
    if (ev) {
      ev.preventDefault();
    }

    this._matDialog.open(DialogSimpleCounterEditComponent, {
      restoreFocus: true,
      data: {
        simpleCounter: this.simpleCounter,
      },
    });
  }
}
