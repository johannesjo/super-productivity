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
  OnInit,
  viewChild,
} from '@angular/core';
import { CdkDrag } from '@angular/cdk/drag-drop';
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
import { T } from '../../../t.const';
import { TaskCopy } from '../../tasks/task.model';
import { selectTaskByIdWithSubTaskData } from '../../tasks/store/task.selectors';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { TaskService } from '../../tasks/task.service';
import { DialogTimeEstimateComponent } from '../../tasks/dialog-time-estimate/dialog-time-estimate.component';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TaskContextMenuComponent } from '../../tasks/task-context-menu/task-context-menu.component';
import { BehaviorSubject, of } from 'rxjs';
import { IssueService } from '../../issue/issue.service';
import { DateTimeFormatService } from '../../../core/date-time-format/date-time-format.service';
import { FH } from '../schedule.const';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

@Component({
  selector: 'schedule-event',
  imports: [MatIcon, TranslateModule, TaskContextMenuComponent],
  templateUrl: './schedule-event.component.html',
  styleUrl: './schedule-event.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: CdkDrag,
      inputs: ['cdkDragData', 'cdkDragDisabled', 'cdkDragStartDelay'],
      outputs: ['cdkDragStarted', 'cdkDragReleased', 'cdkDragEnded', 'cdkDragMoved'],
    },
  ],
})
export class ScheduleEventComponent implements OnInit {
  private _store = inject(Store);
  private _elRef = inject(ElementRef);
  private _matDialog = inject(MatDialog);
  private _cd = inject(ChangeDetectorRef);
  private _issueService = inject(IssueService);
  private _dateTimeFormatService = inject(DateTimeFormatService);
  private _taskService = inject(TaskService);

  T: typeof T = T;
  @HostBinding('title') hoverTitle: string = '';
  @HostBinding('class') cssClass: string = '';
  @HostBinding('style') style: string = '';

  @Input() isMonthView: boolean = false;

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

    const is12Hour = !this._dateTimeFormatService.is24HourFormat;
    const startClockStr = getClockStringFromHours(
      is12Hour && this.se.startHours > 12 ? this.se.startHours - 12 : this.se.startHours,
    );
    const endHours = this.se.startHours + this.se.timeLeftInHours;
    const endClockStr = getClockStringFromHours(
      is12Hour && endHours > 12 ? endHours - 12 : endHours,
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
      this._projectId$.next(this.task.projectId || null);

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
    // Prevent opening dialog when resizing or just finished resizing
    if (this._isResizing || this._justFinishedResizing) {
      return;
    }

    if (this.task) {
      // Use bottom panel on mobile, sidebar on desktop
      this._taskService.setSelectedId(this.task.id);
    } else if (
      this.se.type === SVEType.RepeatProjection ||
      this.se.type === SVEType.RepeatProjectionSplit ||
      this.se.type === SVEType.ScheduledRepeatProjection
    ) {
      const repeatCfg: TaskRepeatCfg = this.se.data as TaskRepeatCfg;
      this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
        data: {
          repeatCfg,
          targetDate: (this.se.id.includes('_') && this.se.id.split('_')[1]) || undefined,
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
  onContextMenu(ev: MouseEvent | TouchEvent): void {
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
            p ? p.theme?.primary : '',
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
        this._store.dispatch(TaskSharedActions.deleteTask({ task }));
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
      TaskSharedActions.updateTask({
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
      TaskSharedActions.updateTask({
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

  // Resize functionality
  private _isResizing = false;
  private _justFinishedResizing = false;
  private _startY = 0;
  private _startHeight = 0;

  isResizable(): boolean {
    // Only allow resizing for scheduled tasks that have a time estimate
    return (
      this.task &&
      (this.se.type === SVEType.ScheduledTask ||
        this.se.type === SVEType.Task ||
        this.se.type === SVEType.SplitTask) &&
      this.task.timeEstimate > 0
    );
  }

  onResizeStart(event: MouseEvent | TouchEvent): void {
    if (!this.isResizable()) return;

    event.stopPropagation();
    event.preventDefault();

    this._isResizing = true;

    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    this._startY = clientY;
    this._startHeight = this._elRef.nativeElement.offsetHeight;

    // Add event listeners for mouse/touch move and end
    const moveHandler = (e: MouseEvent | TouchEvent): void => this._onResizeMove(e);
    const endHandler = (): void => this._onResizeEnd(moveHandler, endHandler);

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler);
    document.addEventListener('touchend', endHandler);

    // Add visual feedback class
    this._elRef.nativeElement.classList.add('is-resizing');
  }

  private _onResizeMove(event: MouseEvent | TouchEvent): void {
    if (!this._isResizing) return;

    event.preventDefault();
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    const deltaY = clientY - this._startY;

    // Calculate new height based on grid row height for snap-to-grid behavior
    const gridContainer = this._elRef.nativeElement.closest(
      '.grid-container',
    ) as HTMLElement | null;
    if (gridContainer) {
      const gridHeight = gridContainer.getBoundingClientRect().height;
      const rowHeight = gridHeight / (24 * FH);
      const rowsChanged = Math.round(deltaY / rowHeight);
      const snappedDelta = rowsChanged * rowHeight;
      const newHeight = Math.max(rowHeight, this._startHeight + snappedDelta);

      // Update the element height temporarily for visual feedback
      this._elRef.nativeElement.style.height = newHeight + 'px';
    } else {
      // Fallback to original behavior
      const newHeight = Math.max(20, this._startHeight + deltaY);
      this._elRef.nativeElement.style.height = newHeight + 'px';
    }
  }

  private _onResizeEnd(moveHandler: any, endHandler: any): void {
    if (!this._isResizing) return;

    this._isResizing = false;

    // Set cooldown flag to prevent immediate click events
    this._justFinishedResizing = true;
    setTimeout(() => {
      this._justFinishedResizing = false;
    }, 200); // 200ms cooldown

    // Remove event listeners
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', endHandler);
    document.removeEventListener('touchmove', moveHandler);
    document.removeEventListener('touchend', endHandler);

    // Remove visual feedback class
    this._elRef.nativeElement.classList.remove('is-resizing');

    // Calculate new duration based on height change
    const currentHeight = this._elRef.nativeElement.offsetHeight;
    const heightDelta = currentHeight - this._startHeight;

    // Convert height change to time change (based on grid row height)
    // Each row represents a time slice (FH rows per hour)
    const timeChangeInMs = this._calculateTimeFromHeightDelta(heightDelta);

    if (Math.abs(timeChangeInMs) > 30000) {
      // Only update if change is more than 30 seconds (to be more responsive)
      const rawEstimate = this.task.timeEstimate + timeChangeInMs;
      const roundedEstimate = Math.max(
        FIVE_MINUTES_IN_MS,
        Math.round(rawEstimate / FIVE_MINUTES_IN_MS) * FIVE_MINUTES_IN_MS,
      );

      if (roundedEstimate !== this.task.timeEstimate) {
        this._store.dispatch(
          TaskSharedActions.updateTask({
            task: {
              id: this.task.id,
              changes: {
                timeEstimate: roundedEstimate,
              },
            },
          }),
        );
      }
    }

    // Reset element height to let CSS handle it
    this._elRef.nativeElement.style.height = '';
  }

  private _calculateTimeFromHeightDelta(heightDelta: number): number {
    // Get the grid container to calculate row height
    const gridContainer = this._elRef.nativeElement.closest(
      '.grid-container',
    ) as HTMLElement | null;
    if (!gridContainer) return 0;

    const gridHeight = gridContainer.getBoundingClientRect().height;
    const rowHeight = gridHeight / (24 * FH); // Total rows = 24 hours * FH rows per hour
    const rowsChanged = heightDelta / rowHeight;
    const hoursChanged = rowsChanged / FH;

    // Convert to milliseconds
    return hoursChanged * 60 * 60 * 1000;
  }
}
