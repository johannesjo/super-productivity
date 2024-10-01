import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  Input,
  output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { AsyncPipe, DatePipe, NgForOf, NgIf } from '@angular/common';
import { IssueModule } from '../../../issue/issue.module';
import { MatIcon } from '@angular/material/icon';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { Task, TaskCopy, TaskReminderOptionId, TaskWithSubTasks } from '../../task.model';
import { EMPTY, forkJoin, Observable, of, ReplaySubject, Subject } from 'rxjs';
import {
  concatMap,
  delay,
  distinctUntilChanged,
  first,
  map,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { Project } from '../../../project/project.model';
import { TaskService } from '../../task.service';
import { TaskRepeatCfgService } from '../../../task-repeat-cfg/task-repeat-cfg.service';
import { MatDialog } from '@angular/material/dialog';
import { IssueService } from '../../../issue/issue.service';
import { TaskAttachmentService } from '../../task-attachment/task-attachment.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { ProjectService } from '../../../project/project.service';
import { WorkContextService } from '../../../work-context/work-context.service';
import { GlobalConfigService } from '../../../config/global-config.service';
import { KeyboardConfig } from '../../../config/keyboard-config.model';
import { DialogScheduleTaskComponent } from '../../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { DialogTimeEstimateComponent } from '../../dialog-time-estimate/dialog-time-estimate.component';
import { DialogEditTaskAttachmentComponent } from '../../task-attachment/dialog-edit-attachment/dialog-edit-task-attachment.component';
import { throttle } from 'helpful-decorators';
import { DialogEditTagsForTaskComponent } from '../../../tag/dialog-edit-tags/dialog-edit-tags-for-task.component';
import { TODAY_TAG } from '../../../tag/tag.const';
import { DialogConfirmComponent } from '../../../../ui/dialog-confirm/dialog-confirm.component';
import { Update } from '@ngrx/entity';
import { IS_TOUCH_PRIMARY } from 'src/app/util/is-mouse-primary';
import { T } from 'src/app/t.const';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { selectTaskByIdWithSubTaskData } from '../../store/task.selectors';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { getWorklogStr } from '../../../../util/get-work-log-str';
import { updateTaskTags } from '../../store/task.actions';
import { PlannerActions } from '../../../planner/store/planner.actions';
import { combineDateAndTime } from '../../../../util/combine-date-and-time';
import { FocusModeService } from '../../../focus-mode/focus-mode.service';
import { isToday } from '../../../../util/is-today.util';

@Component({
  selector: 'task-context-menu-inner',
  standalone: true,
  imports: [
    AsyncPipe,
    IssueModule,
    MatIcon,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    NgForOf,
    TranslateModule,
    MatMenuTrigger,
    NgIf,
    MatIconButton,
    MatTooltip,
  ],
  templateUrl: './task-context-menu-inner.component.html',
  styleUrl: './task-context-menu-inner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
})
export class TaskContextMenuInnerComponent implements AfterViewInit {
  protected readonly IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  protected readonly T = T;

  isAdvancedControls = input<boolean>(false);
  close = output();

  contextMenuPosition: { x: string; y: string } = { x: '100px', y: '100px' };

  @ViewChild('contextMenuTriggerEl', { static: true, read: MatMenuTrigger })
  contextMenuTrigger?: MatMenuTrigger;

  @ViewChild('contextMenu', { static: true, read: MatMenu }) contextMenu?: MatMenu;

  task!: TaskWithSubTasks | Task;

  isTodayTag: boolean = false;
  isCurrent: boolean = false;
  isBacklog: boolean = false;

  private _task$: ReplaySubject<TaskWithSubTasks | Task> = new ReplaySubject(1);
  issueUrl$: Observable<string | null> = this._task$.pipe(
    switchMap((v) => {
      return v.issueType && v.issueId && v.projectId
        ? this._issueService.issueLink$(v.issueType, v.issueId, v.projectId)
        : of(null);
    }),
    take(1),
  );
  moveToProjectList$: Observable<Project[]> = this._task$.pipe(
    map((t) => t.projectId),
    distinctUntilChanged(),
    switchMap((pid) => this._projectService.getProjectsWithoutId$(pid)),
  );

  // isShowMoveFromAndToBacklogBtns$: Observable<boolean> = this._task$.pipe(
  //   take(1),
  //   switchMap((task) =>
  //     task.projectId ? this._projectService.getByIdOnce$(task.projectId) : EMPTY,
  //   ),
  //   map((project) => project.isEnableBacklog),
  // );
  isShowMoveFromAndToBacklogBtns$: Observable<boolean> =
    this.workContextService.activeWorkContext$.pipe(
      take(1),
      map((ctx) => !!ctx.isEnableBacklog),
    );

  private _destroy$: Subject<boolean> = new Subject<boolean>();
  private _isTaskDeleteTriggered: boolean = false;
  private _isOpenedFromKeyboard = false;

  @Input('task') set taskSet(v: TaskWithSubTasks | Task) {
    this.task = v;
    this.isTodayTag = v.tagIds.includes(TODAY_TAG.id);
    this.isCurrent = this._taskService.currentTaskId === v.id;
    this._task$.next(v);
  }

  constructor(
    private _datePipe: DatePipe,
    private readonly _taskService: TaskService,
    private readonly _taskRepeatCfgService: TaskRepeatCfgService,
    private readonly _matDialog: MatDialog,
    private readonly _issueService: IssueService,
    private readonly _attachmentService: TaskAttachmentService,
    private readonly _elementRef: ElementRef,
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    public readonly workContextService: WorkContextService,
    private readonly _globalConfigService: GlobalConfigService,
    private readonly _store: Store,
    private readonly _focusModeService: FocusModeService,
  ) {}

  ngAfterViewInit(): void {
    this.isBacklog = !!this._elementRef.nativeElement.closest('.backlog');

    setTimeout(() => {
      if (!this._isOpenedFromKeyboard) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }
    });
  }

  open(ev: MouseEvent | KeyboardEvent | TouchEvent, isOpenedFromKeyBoard = false): void {
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    if (ev instanceof MouseEvent || ev instanceof TouchEvent) {
      this.contextMenuPosition.x =
        ('touches' in ev ? ev.touches[0].clientX : ev.clientX) + 10 + 'px';
      this.contextMenuPosition.y =
        ('touches' in ev ? ev.touches[0].clientY : ev.clientY) - 48 + 'px';
    }

    this._isOpenedFromKeyboard = isOpenedFromKeyBoard;
    this.contextMenuTrigger?.openMenu();
  }

  focusRelatedTaskOrNext(): void {
    // NOTE: not active for now
    // this.focusTaskOrNextAfter.emit();
  }

  onClose(): void {
    this.focusRelatedTaskOrNext();
    this.close.emit();
  }

  get kb(): KeyboardConfig {
    if (IS_TOUCH_PRIMARY || !this.isAdvancedControls()) {
      return {} as any;
    }
    return (this._globalConfigService.cfg?.keyboard as KeyboardConfig) || {};
  }

  quickAccessKeydown(ev: KeyboardEvent): void {
    const t = ev.target as HTMLElement;
    const btns = Array.from(
      t?.closest('.quick-access')?.querySelectorAll('button') || [],
    );
    //   const btns = Array.from(t?.querySelectorAll('button') || []);

    const currentIndex = btns.indexOf(t as HTMLButtonElement);

    if (ev.key === 'ArrowRight' && currentIndex < btns.length - 1) {
      (btns[currentIndex + 1] as HTMLElement).focus();
    } else if (ev.key === 'ArrowLeft' && currentIndex > 0) {
      (btns[currentIndex - 1] as HTMLElement).focus();
    }
  }

  focusFirstBtn(ev: FocusEvent): void {
    const t = ev.target as HTMLElement;
    t?.parentElement?.querySelector('button')?.focus();
  }

  goToFocusMode(): void {
    this._taskService.setSelectedId(this.task.id);
    this._focusModeService.showFocusOverlay();
  }

  scheduleTask(): void {
    this._matDialog
      .open(DialogScheduleTaskComponent, {
        // we focus inside dialog instead
        autoFocus: false,
        data: { task: this.task },
      })
      .afterClosed()
      // .pipe(takeUntil(this._destroy$))
      .subscribe((isPlanned) => {
        this.focusRelatedTaskOrNext();
      });
  }

  updateIssueData(): void {
    this._issueService.refreshIssueTask(this.task, true, true);
  }

  // editTaskRepeatCfg(): void {
  //   this._matDialog
  //     .open(DialogEditTaskRepeatCfgComponent, {
  //       data: {
  //         task: this.task,
  //       },
  //     })
  //     .afterClosed()
  //     .pipe(takeUntil(this._destroy$))
  //     .subscribe(() => this.focusSelf());
  // }

  async deleteTask(): Promise<void> {
    // NOTE: prevents attempts to delete the same task multiple times
    if (this._isTaskDeleteTriggered) {
      return;
    }
    const taskWithSubTasks = await this._getTaskWithSubtasks();
    this._taskService.remove(taskWithSubTasks);
    this._isTaskDeleteTriggered = true;
  }

  startTask(): void {
    this._taskService.setCurrentId(this.task.id);
  }

  pauseTask(): void {
    this._taskService.pauseCurrent();
  }

  estimateTime(): void {
    this._matDialog
      .open(DialogTimeEstimateComponent, {
        data: { task: this.task },
        autoFocus: !IS_TOUCH_PRIMARY,
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusRelatedTaskOrNext());
  }

  addAttachment(): void {
    this._matDialog
      .open(DialogEditTaskAttachmentComponent, {
        data: {},
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe((result) => {
        if (result) {
          this._attachmentService.addAttachment(this.task.id, result);
        }
        this.focusRelatedTaskOrNext();
      });
  }

  addSubTask(): void {
    this._taskService.addSubTaskTo(this.task.parentId || this.task.id);
  }

  @throttle(200, { leading: true, trailing: false })
  toggleDoneKeyboard(): void {
    this.toggleTaskDone();
  }

  toggleTaskDone(): void {
    if (this.task.isDone) {
      this._taskService.setUnDone(this.task.id);
    } else {
      this._taskService.setDone(this.task.id);
    }
  }

  async editTags(): Promise<void> {
    this._matDialog
      .open(DialogEditTagsForTaskComponent, {
        data: {
          task: this.task,
        },
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusRelatedTaskOrNext());
  }

  addToMyDay(): void {
    this._taskService.addTodayTag(this.task);
  }

  removeFromMyDay(): void {
    this.onTagsUpdated(this.task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id));
  }

  convertToMainTask(): void {
    this._taskService.convertToMainTask(this.task);
  }

  onTagsUpdated(tagIds: string[]): void {
    this._taskService.updateTags(this.task, tagIds);
  }

  // TODO move to service
  async moveTaskToProject(projectId: string): Promise<void> {
    if (projectId === this.task.projectId) {
      return;
    } else if (this.task.issueId && this.task.issueType !== 'CALENDAR') {
      this._snackService.open({
        type: 'CUSTOM',
        ico: 'block',
        msg: T.F.TASK.S.MOVE_TO_PROJECT_NOT_ALLOWED_FOR_ISSUE_TASK,
      });
      return;
    } else if (!this.task.repeatCfgId) {
      const taskWithSubTasks = await this._getTaskWithSubtasks();
      this._taskService.moveToProject(taskWithSubTasks, projectId);
    } else {
      const taskWithSubTasks = await this._getTaskWithSubtasks();

      forkJoin([
        this._taskRepeatCfgService
          .getTaskRepeatCfgById$(this.task.repeatCfgId)
          .pipe(first()),
        this._taskService
          .getTasksWithSubTasksByRepeatCfgId$(this.task.repeatCfgId)
          .pipe(first()),
        this._taskService.getArchiveTasksForRepeatCfgId(this.task.repeatCfgId),
        this._projectService.getByIdOnce$(projectId),
      ])
        .pipe(
          concatMap(
            ([
              reminderCfg,
              nonArchiveInstancesWithSubTasks,
              archiveInstances,
              targetProject,
            ]) => {
              console.log({
                reminderCfg,
                nonArchiveInstancesWithSubTasks,
                archiveInstances,
              });

              // if there is only a single instance (probably just created) than directly update the task repeat cfg
              if (
                nonArchiveInstancesWithSubTasks.length === 1 &&
                archiveInstances.length === 0
              ) {
                this._taskRepeatCfgService.updateTaskRepeatCfg(reminderCfg.id, {
                  projectId,
                });
                this._taskService.moveToProject(taskWithSubTasks, projectId);
                return EMPTY;
              }

              return this._matDialog
                .open(DialogConfirmComponent, {
                  data: {
                    okTxt: T.F.TASK_REPEAT.D_CONFIRM_MOVE_TO_PROJECT.OK,
                    message: T.F.TASK_REPEAT.D_CONFIRM_MOVE_TO_PROJECT.MSG,
                    translateParams: {
                      projectName: targetProject.title,
                      tasksNr:
                        nonArchiveInstancesWithSubTasks.length + archiveInstances.length,
                    },
                  },
                })
                .afterClosed()
                .pipe(
                  tap((isConfirm) => {
                    if (isConfirm) {
                      this._taskRepeatCfgService.updateTaskRepeatCfg(reminderCfg.id, {
                        projectId,
                      });
                      nonArchiveInstancesWithSubTasks.forEach((nonArchiveTask) => {
                        this._taskService.moveToProject(nonArchiveTask, projectId);
                      });

                      const archiveUpdates: Update<TaskCopy>[] = [];
                      archiveInstances.forEach((archiveTask) => {
                        archiveUpdates.push({
                          id: archiveTask.id,
                          changes: { projectId },
                        });
                        if (archiveTask.subTaskIds.length) {
                          archiveTask.subTaskIds.forEach((subId) => {
                            archiveUpdates.push({
                              id: subId,
                              changes: { projectId },
                            });
                          });
                        }
                      });
                      this._taskService.updateArchiveTasks(archiveUpdates);
                    }
                  }),
                );
            },
          ),
        )
        .subscribe(() => this.focusRelatedTaskOrNext());
    }
  }

  moveToBacklog(): void {
    if (this.task.projectId && !this.task.parentId) {
      this._projectService.moveTaskToBacklog(this.task.id, this.task.projectId);
      if (this.task.tagIds.includes(TODAY_TAG.id)) {
        this.removeFromMyDay();
      }
    }
  }

  moveToToday(): void {
    if (this.task.projectId && !this.task.parentId) {
      this._projectService.moveTaskToTodayList(this.task.id, this.task.projectId);
      this.addToMyDay();
    }
  }

  trackByProjectId(i: number, project: Project): string {
    return project.id;
  }

  private async _getTaskWithSubtasks(): Promise<TaskWithSubTasks> {
    return await this._store
      .select(selectTaskByIdWithSubTaskData, { id: this.task.id })
      .pipe(
        first(),
        // NOTE without the delay selectTaskByIdWithSubTaskData triggers twice for unknown reasons
        delay(50),
      )
      .toPromise();
  }

  quickAccessBtnClick(item: number): void {
    const tDate = new Date();
    tDate.setMinutes(0, 0, 0);
    switch (item) {
      case 0:
        this._schedule(tDate);
        break;
      case 1:
        const tomorrow = tDate;
        tomorrow.setDate(tomorrow.getDate() + 1);
        this._schedule(tomorrow);
        break;
      case 2:
        const nextMonday = tDate;
        nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7));
        this._schedule(nextMonday);
        break;
      case 3:
        const nextMonth = tDate;
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        this._schedule(nextMonth);
        break;
    }
    // this.submit();
  }

  private _schedule(selectedDate: Date): void {
    if (!selectedDate) {
      console.warn('no selected date');
      return;
    }

    const newDayDate = new Date(selectedDate);
    const newDay = getWorklogStr(newDayDate);
    const formattedDate = this._datePipe.transform(newDay, 'shortDate') as string;

    if (this.task.plannedAt) {
      const task = this.task;
      const newDate = combineDateAndTime(new Date(this.task.plannedAt), newDayDate);

      const isTodayI = isToday(newDate);
      this._taskService.scheduleTask(
        task,
        newDate.getTime(),
        TaskReminderOptionId.AtStart,
        false,
      );
      if (isTodayI) {
        this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds]);
      } else {
        this._taskService.updateTags(
          task,
          task.tagIds.filter((tid) => tid !== TODAY_TAG.id),
        );
      }
    } else if (newDay === getWorklogStr()) {
      this._store.dispatch(
        updateTaskTags({
          task: this.task,
          newTagIds: [...this.task.tagIds, TODAY_TAG.id],
        }),
      );
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.PLANNER.S.TASK_PLANNED_FOR,
        translateParams: { date: formattedDate },
      });
    } else {
      this._store.dispatch(
        PlannerActions.planTaskForDay({ task: this.task, day: newDay }),
      );
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.PLANNER.S.TASK_PLANNED_FOR,
        translateParams: { date: formattedDate },
      });
    }
  }
}
