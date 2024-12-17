import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { SimpleCounter, SimpleCounterType } from '../simple-counter.model';
import { SimpleCounterService } from '../simple-counter.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogSimpleCounterEditComponent } from '../dialog-simple-counter-edit/dialog-simple-counter-edit.component';
import { T } from 'src/app/t.const';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { merge, of, Subject, Subscription } from 'rxjs';
import { DateService } from 'src/app/core/date/date.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, map, scan, switchMap } from 'rxjs/operators';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';

@Component({
  selector: 'simple-counter-button',
  templateUrl: './simple-counter-button.component.html',
  styleUrls: ['./simple-counter-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SimpleCounterButtonComponent implements OnDestroy, OnInit {
  T: typeof T = T;
  SimpleCounterType: typeof SimpleCounterType = SimpleCounterType;
  todayStr: string = this._dateService.todayStr();

  simpleCounter = input<SimpleCounter>();
  isTimeUp = signal<boolean>(false);

  private _todayStr$ = this._globalTrackingIntervalService.todayDateStr$;
  private _subs = new Subscription();
  private _resetCountdown$ = new Subject();
  private _countdownDuration$ = toObservable(this.simpleCounter).pipe(
    map((c) => c?.countdownDuration),
    filter((v): v is number => typeof v === 'number' && v > 0),
    distinctUntilChanged(),
  );

  countdownTime$ = this._countdownDuration$.pipe(
    switchMap((countdownDuration) =>
      merge(of(true), this._resetCountdown$).pipe(
        switchMap(() =>
          this._globalTrackingIntervalService.tick$.pipe(
            scan((acc, tick) => {
              if (!this.simpleCounter()?.isOn) {
                return acc;
              }

              const newVal = acc - tick.duration;
              return newVal < 0 ? 0 : newVal;
            }, countdownDuration),
            // }, 10000),
          ),
        ),
        distinctUntilChanged(),
      ),
    ),
  );

  constructor(
    private _simpleCounterService: SimpleCounterService,
    private _matDialog: MatDialog,
    private _globalTrackingIntervalService: GlobalTrackingIntervalService,
    private _dateService: DateService,
    private _bannerService: BannerService,
    private _cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._todayStr$.subscribe((todayStr) => {
        this.todayStr = todayStr;
        this._cd.detectChanges();
      }),
    );

    if (this.simpleCounter()?.type === SimpleCounterType.RepeatedCountdownReminder) {
      this._subs.add(
        this.countdownTime$.subscribe((countdownTime) => {
          if (countdownTime === 0) {
            this.isTimeUp.set(true);
            this._bannerService.open({
              id: BannerId.SimpleCounterCountdownComplete,
              isHideDismissBtn: true,
              msg: `<i>${this.simpleCounter()?.title || 'Simple Counter Countdown'}</i> is finished!`,
              action: {
                label: 'Count up and restart!',
                fn: () => {
                  this.countUpAndNextRepeatCountdownSession();
                },
              },
            });
          }
        }),
      );
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  countUpAndNextRepeatCountdownSession(): void {
    this._bannerService.dismiss(BannerId.SimpleCounterCountdownComplete);
    this.toggleCounter();
    this._resetCountdown$.next();
    this.isTimeUp.set(false);
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
