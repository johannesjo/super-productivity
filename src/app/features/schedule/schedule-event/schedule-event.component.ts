import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ScheduleEvent } from '../schedule.model';
import { MatIcon } from '@angular/material/icon';
import { delay, first, takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectProjectById } from '../../project/store/project.selectors';
import { BaseComponent } from '../../../core/base-component/base.component';
import { MatMiniFabButton } from '@angular/material/button';
import { getClockStringFromHours } from '../../../util/get-clock-string-from-hours';
import { SVEType } from '../schedule.const';
import { isDraggableSE } from '../map-schedule-data/is-schedule-types-type';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditTaskRepeatCfgComponent } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { AsyncPipe } from '@angular/common';
import { IssueModule } from '../../issue/issue.module';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { T } from 'src/app/t.const';
import { TaskCopy } from '../../tasks/task.model';
import { selectTaskByIdWithSubTaskData } from '../../tasks/store/task.selectors';
import { deleteTask, updateTask } from '../../tasks/store/task.actions';
import { DialogTimeEstimateComponent } from '../../tasks/dialog-time-estimate/dialog-time-estimate.component';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { DialogAddTaskReminderComponent } from '../../tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import { AddTaskReminderInterface } from '../../tasks/dialog-add-task-reminder/add-task-reminder-interface';
import { DialogPlanForDayComponent } from '../../planner/dialog-plan-for-day/dialog-plan-for-day.component';
import { getWorklogStr } from '../../../util/get-work-log-str';

@Component({
  selector: 'schedule-event',
  standalone: true,
  imports: [
    MatIcon,
    MatMiniFabButton,
    AsyncPipe,
    IssueModule,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    TranslateModule,
    MatMenuTrigger,
  ],
  templateUrl: './schedule-event.component.html',
  styleUrl: './schedule-event.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleEventComponent extends BaseComponent implements OnInit, OnDestroy {
  T: typeof T = T;

  @Input({ required: true })
  set event(event: ScheduleEvent) {
    this.se = event;
    const startClockStr = getClockStringFromHours(this.se.startHours);
    const endClockStr = getClockStringFromHours(
      this.se.startHours + this.se.timeLeftInHours,
    );
    // this.durationStr = (this.se.timeLeftInHours * 60).toString().substring(0, 4);
    this.title = startClockStr + ' - ' + endClockStr + '  ' + this.se.title;

    if (isDraggableSE(this.se)) {
      this._elRef.nativeElement.id = 't-' + (this.se.data as any).id;
    }

    if (
      this.se.type === SVEType.Task ||
      this.se.type === SVEType.SplitTask ||
      this.se.type === SVEType.TaskPlannedForDay ||
      this.se.type === SVEType.SplitTaskPlannedForDay
    ) {
      this.task = this.se.data as TaskCopy;
    }
  }

  se!: ScheduleEvent;
  task!: TaskCopy;

  contextMenuPosition: { x: string; y: string } = { x: '0px', y: '0px' };

  @ViewChild('contextMenuTriggerEl', { static: false, read: MatMenuTrigger })
  contextMenu!: MatMenuTrigger;

  @HostBinding('title') title: string = '';

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
    // NOTE: styled in parent because of adjacent sibling selector
    if (this.se.isCloseToOthersFirst) {
      addClass += ' close-to-others-first';
    } else if (this.se.isCloseToOthers) {
      addClass += ' close-to-others';
    }

    if (this.se.timeLeftInHours < 1 / 4) {
      addClass += ' very-short-event';
    }

    return this.se?.type + '  ' + addClass;
  }

  @HostBinding('style') get style(): string {
    return this.se?.style;
  }

  get isSplitStart(): boolean {
    return (
      this.se?.type === SVEType.SplitTask ||
      this.se?.type === SVEType.RepeatProjectionSplit ||
      this.se?.type === SVEType.SplitTaskPlannedForDay
    );
  }

  get isSplitContinued(): boolean {
    return (
      this.se?.type === SVEType.SplitTaskContinued ||
      this.se?.type === SVEType.RepeatProjectionSplitContinued
    );
  }

  get isSplitContinuedLast(): boolean {
    return (
      this.se?.type === SVEType.SplitTaskContinuedLast ||
      this.se?.type === SVEType.RepeatProjectionSplitContinuedLast
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
      case SVEType.ScheduledRepeatProjection:
      case SVEType.RepeatProjection:
      case SVEType.RepeatProjectionSplit: {
        return 'REPEAT';
      }
      case SVEType.TaskPlannedForDay:
      case SVEType.SplitTaskPlannedForDay: {
        return 'PLANNED_FOR_DAY';
      }
      case SVEType.Task:
      case SVEType.SplitTask: {
        return 'FLOW';
      }
      case SVEType.CalendarEvent: {
        return 'CAL_PROJECTION';
      }
      case SVEType.ScheduledTask: {
        return 'SCHEDULED_TASK';
      }
      case SVEType.LunchBreak: {
        return 'LUNCH_BREAK';
      }
    }
    return 'SPLIT_CONTINUE';
  }

  protected readonly SVEType = SVEType;

  @HostListener('click') clickHandler(): void {
    if (
      this.se.type === SVEType.RepeatProjection ||
      this.se.type === SVEType.RepeatProjectionSplit ||
      this.se.type === SVEType.ScheduledRepeatProjection ||
      this.se.type === SVEType.RepeatProjectionSplitContinued ||
      this.se.type === SVEType.RepeatProjectionSplitContinuedLast
    ) {
      const repeatCfg: TaskRepeatCfg = this.se.data as TaskRepeatCfg;
      console.log(repeatCfg);

      this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
        data: {
          repeatCfg,
        },
      });
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(ev): void {
    if (this.task) {
      this.openContextMenu(ev);
    }
  }

  constructor(
    private _store: Store,
    private _elRef: ElementRef,
    private _matDialog: MatDialog,
  ) {
    super();
  }

  ngOnInit(): void {
    const pid = (this.se?.data as any)?.projectId;
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

  openContextMenu(event: TouchEvent | MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.contextMenuPosition.x =
      ('touches' in event ? event.touches[0].clientX : event.clientX) + 'px';
    this.contextMenuPosition.y =
      ('touches' in event ? event.touches[0].clientY : event.clientY) + 'px';
    this.contextMenu.openMenu();
  }

  deleteTask(isClick: boolean = false): void {
    this._store
      .select(selectTaskByIdWithSubTaskData, { id: this.task.id })
      .pipe(
        first(),
        takeUntil(this.onDestroy$),
        // NOTE without the delay selectTaskByIdWithSubTaskData triggers twice for unknown reasons
        delay(50),
      )
      .subscribe((task) => {
        this._store.dispatch(deleteTask({ task }));
      });
  }

  estimateTime(): void {
    this._matDialog.open(DialogTimeEstimateComponent, {
      data: { task: this.task, isFocusEstimateOnMousePrimaryDevice: true },
      autoFocus: !IS_TOUCH_PRIMARY,
    });
  }

  markAsDone(): void {
    this._store.dispatch(
      updateTask({
        task: {
          id: this.task.id,
          changes: {
            isDone: true,
          },
        },
      }),
    );
  }

  markAsUnDone(): void {
    this._store.dispatch(
      updateTask({
        task: {
          id: this.task.id,
          changes: {
            isDone: false,
          },
        },
      }),
    );
  }

  editReminder(): void {
    this._matDialog.open(DialogAddTaskReminderComponent, {
      data: { task: this.task } as AddTaskReminderInterface,
    });
  }

  planForDay(): void {
    this._matDialog.open(DialogPlanForDayComponent, {
      // we focus inside dialog instead
      autoFocus: false,
      data: {
        task: this.task,
        day: getWorklogStr(this.task?.plannedAt || undefined),
      },
    });
  }
}
