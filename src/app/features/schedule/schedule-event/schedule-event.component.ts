import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ScheduleEvent } from '../schedule.model';
import { MatIcon } from '@angular/material/icon';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectProjectById } from '../../project/store/project.selectors';
import { BaseComponent } from '../../../core/base-component/base.component';
import { MatMiniFabButton } from '@angular/material/button';
import { getClockStringFromHours } from '../../../util/get-clock-string-from-hours';
import { ScheduleViewEntryType } from '../schedule.const';

@Component({
  selector: 'schedule-event',
  standalone: true,
  imports: [MatIcon, MatMiniFabButton],
  templateUrl: './schedule-event.component.html',
  styleUrl: './schedule-event.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleEventComponent extends BaseComponent implements OnInit, OnDestroy {
  @Input({ required: true })
  set event(event: ScheduleEvent) {
    this.se = event;
    this._elRef.nativeElement.id = 't-' + (this.se.data as any).id;
    this.startClockString = getClockStringFromHours(this.se.startHours);
    this.durationStr = (this.se.timeLeftInHours * 60).toString().substring(0, 4);
  }

  startClockString: string = '';
  durationStr: string = '';

  se!: ScheduleEvent;

  @HostBinding('class') get cssClass(): string {
    // console.log('CLASS');

    let addClass = '';
    if (this.isSplitContinued) {
      addClass = 'split-continued';
    } else if (this.isSplitContinuedLast) {
      addClass = 'split-continued-last';
    } else if (this.isSplitStart) {
      addClass = 'split-start';
    }

    return this.se?.type + '  ' + addClass;
  }

  @HostBinding('style') get style(): string {
    return this.se?.style;
  }

  get isSplitStart(): boolean {
    return (
      this.se?.type === ScheduleViewEntryType.SplitTask ||
      this.se?.type === ScheduleViewEntryType.RepeatProjectionSplit ||
      this.se?.type === ScheduleViewEntryType.SplitTaskPlannedForDay
    );
  }

  get isSplitContinued(): boolean {
    return (
      this.se?.type === ScheduleViewEntryType.SplitTaskContinued ||
      this.se?.type === ScheduleViewEntryType.RepeatProjectionSplitContinued
    );
  }

  get isSplitContinuedLast(): boolean {
    return (
      this.se?.type === ScheduleViewEntryType.SplitTaskContinuedLast ||
      this.se?.type === ScheduleViewEntryType.RepeatProjectionSplitContinuedLast
    );
  }

  get icoType():
    | 'REPEAT'
    | 'FLOW'
    | 'SCHEDULED_TASK'
    | 'PLANNED_FOR_DAY'
    | 'CAL_PROJECTION'
    | 'SPLIT_CONTINUE'
    | 'LUNCH_BREAK' {
    switch (this.se?.type) {
      case ScheduleViewEntryType.RepeatProjection:
      case ScheduleViewEntryType.RepeatProjectionSplit: {
        return 'REPEAT';
      }
      case ScheduleViewEntryType.TaskPlannedForDay:
      case ScheduleViewEntryType.SplitTaskPlannedForDay: {
        return 'PLANNED_FOR_DAY';
      }
      case ScheduleViewEntryType.Task:
      case ScheduleViewEntryType.SplitTask: {
        return 'FLOW';
      }
      case ScheduleViewEntryType.CalendarEvent: {
        return 'CAL_PROJECTION';
      }
      case ScheduleViewEntryType.ScheduledTask: {
        return 'SCHEDULED_TASK';
      }
      case ScheduleViewEntryType.LunchBreak: {
        return 'LUNCH_BREAK';
      }
    }
    return 'SPLIT_CONTINUE';
  }

  protected readonly ScheduleViewEntryType = ScheduleViewEntryType;

  constructor(
    private _store: Store,
    private _elRef: ElementRef,
  ) {
    super();
  }

  ngOnInit(): void {
    const pid = (this.se?.data as any)?.projectId;
    if (
      this.se.type === ScheduleViewEntryType.SplitTask ||
      this.se.type === ScheduleViewEntryType.Task ||
      this.se.type === ScheduleViewEntryType.SplitTaskPlannedForDay ||
      this.se.type === ScheduleViewEntryType.TaskPlannedForDay
    ) {
    }

    if (pid) {
      this._store
        .select(selectProjectById, { id: pid })
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((p) => {
          console.log('SET COLOR');

          this._elRef.nativeElement.style.setProperty('--project-color', p.theme.primary);
        });
    }
  }
}
