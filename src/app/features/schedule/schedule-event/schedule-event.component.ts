import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  Input,
  LOCALE_ID,
  OnInit,
  viewChild,
} from '@angular/core';
import { ScheduleEvent, ScheduleFromCalendarEvent } from '../schedule.model';
import { MatIcon } from '@angular/material/icon';
import { delay, first, switchMap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectProjectById } from '../../project/store/project.selectors';
import { getClockStringFromHours } from '../../../util/get-clock-string-from-hours';
import {
  SCHEDULE_TASK_MIN_DURATION_IN_MS,
  SVEType,
  T_ID_PREFIX,
} from '../schedule.const';
import { isDraggableSE } from '../map-schedule-data/is-schedule-types-type';
import { MatDialog } from '@angular/material/dialog';
import { DialogEditTaskRepeatCfgComponent } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { TranslateModule } from '@ngx-translate/core';
import { T } from 'src/app/t.const';
import { TaskCopy } from '../../tasks/task.model';
import { selectTaskByIdWithSubTaskData } from '../../tasks/store/task.selectors';
import { deleteTask, updateTask } from '../../tasks/store/task.actions';
import { DialogTimeEstimateComponent } from '../../tasks/dialog-time-estimate/dialog-time-estimate.component';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogTaskDetailPanelComponent } from '../../tasks/dialog-task-detail-panel/dialog-task-detail-panel.component';
import { TaskContextMenuComponent } from '../../tasks/task-context-menu/task-context-menu.component';
import { BehaviorSubject, of } from 'rxjs';
import { IssueService } from '../../issue/issue.service';

@Component({
  selector: 'schedule-event',
  imports: [MatIcon, TranslateModule, TaskContextMenuComponent],
  templateUrl: './schedule-event.component.html',
  styleUrl: './schedule-event.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleEventComponent implements OnInit {
  private _store = inject(Store);
  private _elRef = inject(ElementRef);
  private _matDialog = inject(MatDialog);
  private _cd = inject(ChangeDetectorRef);
  private _issueService = inject(IssueService);
  private locale = inject(LOCALE_ID);

  T: typeof T = T;
  @HostBinding('title') hoverTitle: string = '';
  @HostBinding('class') cssClass: string = '';
  @HostBinding('style') style: string = '';

  title: string = '';
  se!: ScheduleEvent;
  task!: TaskCopy;
  scheduledClockStr: string = '';
  isSplitStart: boolean = false;
  isSplitContinued: boolean = false;
  isSplitContinuedLast: boolean = false;
  icoType:
    | 'REPEAT'
    | 'FLOW'
    | 'SCHEDULED_TASK'
    | 'PLANNED_FOR_DAY'
    | 'CAL_PROJECTION'
    | 'SPLIT_CONTINUE'
    | 'LUNCH_BREAK' = 'SPLIT_CONTINUE';

  is12HourFormat = Intl.DateTimeFormat(this.locale, { hour: 'numeric' }).resolvedOptions()
    .hour12;

  contextMenuPosition: { x: string; y: string } = { x: '0px', y: '0px' };

  readonly taskContextMenu = viewChild('taskContextMenu', {
    read: TaskContextMenuComponent,
  });

  protected readonly SVEType = SVEType;
  destroyRef = inject(DestroyRef);
  private _isBeingSubmitted: boolean = false;
  private _projectId$ = new BehaviorSubject<string | null>(null);

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input({ required: true })
  set event(event: ScheduleEvent) {
    this.se = event;
    this.title =
      (this.se as any)?.data?.title ||
      (this.se.type === SVEType.LunchBreak ? 'Lunch Break' : 'TITLE');

    const startClockStr = getClockStringFromHours(
      this.is12HourFormat && this.se.startHours > 12
        ? this.se.startHours - 12
        : this.se.startHours,
    );
    const endClockStr = getClockStringFromHours(
      this.se.startHours + this.se.timeLeftInHours,
    );
    // this.durationStr = (this.se.timeLeftInHours * 60).toString().substring(0, 4);
    this.hoverTitle = startClockStr + ' - ' + endClockStr + '  ' + this.title;
    // this.scheduledClockStr = startClockStr + ' - ' + endClockStr;
    this.scheduledClockStr = startClockStr;

    if (isDraggableSE(this.se)) {
      this._elRef.nativeElement.id = T_ID_PREFIX + (this.se.data as any).id;
    }

    // SET TASK IF OF TYPE
    if (
      this.se.type === SVEType.Task ||
      this.se.type === SVEType.SplitTask ||
      this.se.type === SVEType.TaskPlannedForDay ||
      this.se.type === SVEType.SplitTaskPlannedForDay ||
      this.se.type === SVEType.ScheduledTask
    ) {
      this.task = this.se.data as TaskCopy;
      this._projectId$.next(this.task.projectId);

      if (
        (this.se.type === SVEType.Task || this.se.type === SVEType.TaskPlannedForDay) &&
        this.task.timeEstimate === SCHEDULE_TASK_MIN_DURATION_IN_MS &&
        this.task.timeSpent === 0
      ) {
        // this.hoverTitle = '! default estimate was to 15min ! – ' + this.hoverTitle;
        this.hoverTitle += '  !!!!! ESTIMATE FOR SCHEDULE WAS SET TO 10MIN !!!!!';
      }
    }

    // SPLIT STUFF
    this.isSplitStart = false;
    this.isSplitContinued = false;
    this.isSplitContinuedLast = false;
    if (
      this.se.type === SVEType.SplitTask ||
      this.se.type === SVEType.RepeatProjectionSplit ||
      this.se.type === SVEType.SplitTaskPlannedForDay
    ) {
      this.isSplitStart = true;
    } else if (
      this.se.type === SVEType.SplitTaskContinued ||
      this.se.type === SVEType.RepeatProjectionSplitContinued
    ) {
      this.isSplitContinued = true;
    } else if (
      this.se.type === SVEType.SplitTaskContinuedLast ||
      this.se.type === SVEType.RepeatProjectionSplitContinuedLast
    ) {
      this.isSplitContinuedLast = true;
    }

    // CSS CLASS
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

    // if (!(this.se.data as any).projectId) {
    //   addClass += ' no-project';
    // }

    if (this.se.timeLeftInHours <= 1 / 4) {
      addClass += ' very-short-event';
    }
    this.cssClass = this.se.type + '  ' + addClass;

    // STYLE
    this.style = this.se.style;

    // ICO TYPE
    this.icoType = this._getIcoType();
    this._cd.detectChanges();
  }

  // @HostListener('dblclick', ['$event'])
  // async dblClickHandler(): Promise<void> {
  //   if (this.task) {
  //     this._matDialog.open(DialogTaskAdditionalInfoPanelComponent, {
  //       data: { taskId: this.task.id },
  //     });
  //   }
  // }

  @HostListener('click')
  async clickHandler(): Promise<void> {
    if (this.task) {
      this._matDialog.open(DialogTaskDetailPanelComponent, {
        data: { taskId: this.task.id },
      });
    } else if (
      this.se.type === SVEType.RepeatProjection ||
      this.se.type === SVEType.RepeatProjectionSplit ||
      this.se.type === SVEType.ScheduledRepeatProjection
    ) {
      const repeatCfg: TaskRepeatCfg = this.se.data as TaskRepeatCfg;
      this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
        data: {
          repeatCfg,
        },
      });
    } else if (this.se.type === SVEType.CalendarEvent) {
      if (this._isBeingSubmitted) {
        return;
      }
      this._isBeingSubmitted = true;

      const data = this.se.data as ScheduleFromCalendarEvent;
      this._issueService.addTaskFromIssue({
        issueDataReduced: data,
        issueProviderId: data.calProviderId,
        issueProviderKey: 'ICAL',
        isForceDefaultProject: true,
      });
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(ev): void {
    if (this.task) {
      this.openContextMenu(ev);
    }
  }

  ngOnInit(): void {
    if (this.task) {
      this._projectId$
        .pipe(
          switchMap((projectId) =>
            projectId
              ? this._store.select(selectProjectById, { id: projectId })
              : of(null),
          ),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((p) => {
          this._elRef.nativeElement.style.setProperty(
            '--project-color',
            p ? p.theme.primary : '',
          );
        });
    }
  }

  openContextMenu(event: TouchEvent | MouseEvent): void {
    this.taskContextMenu()?.open(event);
  }

  deleteTask(): void {
    this._store
      .select(selectTaskByIdWithSubTaskData, { id: this.task.id })
      .pipe(
        first(),
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

  // scheduleTask(): void {
  //   this._matDialog.open(DialogScheduleTaskComponent, {
  //     // we focus inside dialog instead
  //     autoFocus: false,
  //     data: {
  //       task: this.task,
  //     },
  //   });
  // }

  private _getIcoType():
    | 'REPEAT'
    | 'FLOW'
    | 'SCHEDULED_TASK'
    | 'PLANNED_FOR_DAY'
    | 'CAL_PROJECTION'
    | 'SPLIT_CONTINUE'
    | 'LUNCH_BREAK' {
    switch (this.se.type) {
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
}
