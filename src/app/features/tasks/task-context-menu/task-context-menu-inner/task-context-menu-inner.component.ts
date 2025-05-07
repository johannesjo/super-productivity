import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  Input,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
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
import { DialogConfirmComponent } from '../../../../ui/dialog-confirm/dialog-confirm.component';
import { Update } from '@ngrx/entity';
import { IS_TOUCH_PRIMARY } from 'src/app/util/is-mouse-primary';
import { T } from 'src/app/t.const';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { selectTaskByIdWithSubTaskData } from '../../store/task.selectors';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { getWorklogStr } from '../../../../util/get-work-log-str';
import { PlannerActions } from '../../../planner/store/planner.actions';
import { combineDateAndTime } from '../../../../util/combine-date-and-time';
import { DateAdapter } from '@angular/material/core';
import { ICAL_TYPE } from '../../../issue/issue.const';
import { IssueIconPipe } from '../../../issue/issue-icon/issue-icon.pipe';
import { showFocusOverlay } from '../../../focus-mode/store/focus-mode.actions';
import { toSignal } from '@angular/core/rxjs-interop';
import { TagService } from '../../../tag/tag.service';
import { DialogPromptComponent } from '../../../../ui/dialog-prompt/dialog-prompt.component';
import { unScheduleTask } from '../../store/task.actions';
import { planTasksForToday } from '../../../tag/store/tag.actions';
import { selectTodayTagTaskIds } from '../../../tag/store/tag.reducer';
import { isToday } from '../../../../util/is-today.util';

@Component({
  selector: 'task-context-menu-inner',
  imports: [
    AsyncPipe,
    MatIcon,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    TranslateModule,
    MatMenuTrigger,
    MatIconButton,
    MatTooltip,
    IssueIconPipe,
  ],
  templateUrl: './task-context-menu-inner.component.html',
  styleUrl: './task-context-menu-inner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
})
export class TaskContextMenuInnerComponent implements AfterViewInit {
  private readonly _datePipe = inject(DatePipe);
  private readonly _taskService = inject(TaskService);
  private readonly _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _issueService = inject(IssueService);
  private readonly _attachmentService = inject(TaskAttachmentService);
  private readonly _elementRef = inject(ElementRef);
  private readonly _snackService = inject(SnackService);
  private readonly _projectService = inject(ProjectService);
  private readonly _globalConfigService = inject(GlobalConfigService);
  private readonly _store = inject(Store);
  private readonly _dateAdapter = inject<DateAdapter<unknown>>(DateAdapter);
  private readonly _tagService = inject(TagService);
  private readonly _translateService = inject(TranslateService);
  private readonly _workContextService = inject(WorkContextService);

  protected readonly IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  protected readonly T = T;

  isAdvancedControls = input<boolean>(false);
  todayList = toSignal(this._store.select(selectTodayTagTaskIds), { initialValue: [] });
  isOnTodayList = computed(() => this.todayList().includes(this.task.id));

  // eslint-disable-next-line @angular-eslint/no-output-native
  close = output();

  contextMenuPosition: { x: string; y: string } = { x: '100px', y: '100px' };

  readonly contextMenuTrigger = viewChild('contextMenuTriggerEl', {
    read: MatMenuTrigger,
  });

  readonly contextMenu = viewChild('contextMenu', { read: MatMenu });

  task!: TaskWithSubTasks | Task;

  isCurrent: boolean = false;
  isBacklog: boolean = false;

  private _task$: ReplaySubject<TaskWithSubTasks | Task> = new ReplaySubject(1);
  issueUrl$: Observable<string | null> = this._task$.pipe(
    switchMap((v) => {
      return v.issueType && v.issueId && v.issueProviderId
        ? this._issueService.issueLink$(v.issueType, v.issueId, v.issueProviderId)
        : of(null);
    }),
    take(1),
  );
  moveToProjectList$: Observable<Project[]> = this._task$.pipe(
    map((t) => t.projectId),
    distinctUntilChanged(),
    switchMap((pid) => this._projectService.getProjectsWithoutId$(pid || null)),
  );
  toggleTagList = toSignal(this._tagService.tagsNoMyDayAndNoList$, { initialValue: [] });

  // isShowMoveFromAndToBacklogBtns$: Observable<boolean> = this._task$.pipe(
  //   take(1),
  //   switchMap((task) =>
  //     task.projectId ? this._projectService.getByIdOnce$(task.projectId) : EMPTY,
  //   ),
  //   map((project) => project.isEnableBacklog),
  // );
  isShowMoveFromAndToBacklogBtns$: Observable<boolean> =
    this._workContextService.activeWorkContext$.pipe(
      take(1),
      map((ctx) => !!ctx.isEnableBacklog),
    );

  private _destroy$: Subject<boolean> = new Subject<boolean>();
  private _isTaskDeleteTriggered: boolean = false;
  private _isOpenedFromKeyboard = false;

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input('task') set taskSet(v: TaskWithSubTasks | Task) {
    this.task = v;
    this.isCurrent = this._taskService.currentTaskId === v.id;
    this._task$.next(v);
  }

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
    this.contextMenuTrigger()?.openMenu();
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
    this._store.dispatch(showFocusOverlay());
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

  moveToTop(): void {
    this._taskService.moveToTop(this.task.id, this.task.parentId, false);
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

  addToMyDay(): void {
    this._store.dispatch(
      planTasksForToday({ taskIds: [this.task.id], isShowSnack: true }),
    );
  }

  unschedule(): void {
    this._store.dispatch(
      unScheduleTask({ id: this.task.id, reminderId: this.task.reminderId }),
    );
  }

  convertToMainTask(): void {
    this._taskService.convertToMainTask(this.task);
  }

  onTagsUpdated(tagIds: string[]): void {
    this._taskService.updateTags(this.task, tagIds);
  }

  toggleTag(tagId: string): void {
    const task = this.task;
    const tagIds = task.tagIds.includes(tagId)
      ? task.tagIds.filter((id) => id !== tagId)
      : [...task.tagIds, tagId];

    this.onTagsUpdated(tagIds);
  }

  openAddNewTag(): void {
    this._matDialog
      .open(DialogPromptComponent, {
        data: {
          placeholder: T.F.TAG.TTL.ADD_NEW_TAG,
        },
      })
      .afterClosed()
      .subscribe((val) => {
        if (val) {
          const t = this.task;
          const newTagId = this._tagService.addTag({
            title: val,
          });
          this._taskService.updateTags(t, [...t.tagIds, newTagId]);
        }
      });
  }

  // TODO move to service
  async moveTaskToProject(projectId: string): Promise<void> {
    if (projectId === this.task.projectId) {
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
      if (
        this.task.dueDay === getWorklogStr() ||
        (this.task.dueWithTime && isToday(this.task.dueWithTime))
      ) {
        this.unschedule();
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
      case 1:
        this._schedule(tDate);
        break;
      case 2:
        const tomorrow = tDate;
        tomorrow.setDate(tomorrow.getDate() + 1);
        this._schedule(tomorrow);
        break;
      case 3:
        const nextFirstDayOfWeek = tDate;
        const dayOffset =
          (this._dateAdapter.getFirstDayOfWeek() -
            this._dateAdapter.getDayOfWeek(nextFirstDayOfWeek) +
            7) %
            7 || 7;
        nextFirstDayOfWeek.setDate(nextFirstDayOfWeek.getDate() + dayOffset);
        this._schedule(nextFirstDayOfWeek);
        break;
      // case 4:
      //   const nextMonth = tDate;
      //   nextMonth.setMonth(nextMonth.getMonth() + 1);
      //   this._schedule(nextMonth);
      //   break;
    }
  }

  private async _schedule(selectedDate: Date, isRemoveFromToday = false): Promise<void> {
    if (!selectedDate) {
      console.warn('no selected date');
      return;
    }

    const newDayDate = new Date(selectedDate);
    const newDay = getWorklogStr(newDayDate);

    if (isRemoveFromToday) {
      this.unschedule();
    } else if (this.task.dueDay === newDay) {
      const formattedDate =
        newDay == getWorklogStr()
          ? this._translateService.instant(T.G.TODAY_TAG_TITLE)
          : (this._datePipe.transform(newDay, 'shortDate') as string);
      this._snackService.open({
        type: 'CUSTOM',
        ico: 'info',
        msg: T.F.PLANNER.S.TASK_ALREADY_PLANNED,
        translateParams: { date: formattedDate },
      });
      return;
    } else if (this.task.dueWithTime) {
      const task = this.task;
      const newDate = combineDateAndTime(newDayDate, new Date(this.task.dueWithTime));
      this._taskService.scheduleTask(
        task,
        newDate.getTime(),
        TaskReminderOptionId.AtStart,
        false,
      );
    } else {
      if (newDay === getWorklogStr()) {
        this.addToMyDay();
      } else {
        this._store.dispatch(
          PlannerActions.planTaskForDay({
            task: this.task,
            day: newDay,
            isShowSnack: true,
          }),
        );
      }
    }
  }

  unscheduleTask(): void {
    this._store.dispatch(
      unScheduleTask({
        id: this.task.id,
        reminderId: this.task.reminderId,
      }),
    );
  }

  protected readonly ICAL_TYPE = ICAL_TYPE;
}
