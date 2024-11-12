import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { SimpleCounter, SimpleCounterType } from '../simple-counter.model';
import { SimpleCounterService } from '../simple-counter.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogSimpleCounterEditComponent } from '../dialog-simple-counter-edit/dialog-simple-counter-edit.component';
import { T } from 'src/app/t.const';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { EMPTY, Subscription } from 'rxjs';
import { DateService } from 'src/app/core/date/date.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';

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

  simpleCounter = input<SimpleCounter>();

  repeatedStopWatchTime$ = toObservable(this.simpleCounter).pipe(
    switchMap((sc) => {
      return sc?.isOn ? this._globalTrackingIntervalService.tick$ : EMPTY;
    }),
  );

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
    const c = this.simpleCounter();
    if (!c) {
      throw new Error('No simple counter model');
    }
    this._simpleCounterService.toggleCounter(c.id);
  }

  toggleCounter(): void {
    const c = this.simpleCounter();
    if (!c) {
      throw new Error('No simple counter model');
    }
    this._simpleCounterService.increaseCounterToday(c.id, 1);
  }

  reset(): void {
    const c = this.simpleCounter();
    if (!c) {
      throw new Error('No simple counter model');
    }
    this._simpleCounterService.setCounterToday(c.id, 0);
  }

  edit(ev?: Event): void {
    if (ev) {
      ev.preventDefault();
    }
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
