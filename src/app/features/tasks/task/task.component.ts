import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  Renderer2,
  signal,
  viewChild,
} from '@angular/core';
import { TaskService } from '../task.service';
import { EMPTY, forkJoin, of } from 'rxjs';
import {
  HideSubTasksMode,
  TaskCopy,
  TaskDetailTargetPanel,
  TaskWithSubTasks,
} from '../task.model';
import { MatDialog } from '@angular/material/dialog';
import { DialogTimeEstimateComponent } from '../dialog-time-estimate/dialog-time-estimate.component';
import {
  expandAnimation,
  expandInOnlyAnimation,
} from '../../../ui/animations/expand.ani';
import { GlobalConfigService } from '../../config/global-config.service';
import { checkKeyCombo } from '../../../util/check-key-combo';
import {
  concatMap,
  distinctUntilChanged,
  first,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { TaskAttachmentService } from '../task-attachment/task-attachment.service';
import { DialogEditTaskAttachmentComponent } from '../task-attachment/dialog-edit-attachment/dialog-edit-task-attachment.component';
import { swirlAnimation } from '../../../ui/animations/swirl-in-out.ani';
import { DialogEditTaskRepeatCfgComponent } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { ProjectService } from '../../project/project.service';
import { Project } from '../../project/project.model';
import { T } from '../../../t.const';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { WorkContextService } from '../../work-context/work-context.service';
import { throttle } from 'helpful-decorators';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { Update } from '@ngrx/entity';
import { isToday } from '../../../util/is-today.util';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { KeyboardConfig } from '../../config/keyboard-config.model';
import { DialogScheduleTaskComponent } from '../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { TaskContextMenuComponent } from '../task-context-menu/task-context-menu.component';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ICAL_TYPE } from '../../issue/issue.const';
import { TaskTitleComponent } from '../../../ui/task-title/task-title.component';
import { MatIcon } from '@angular/material/icon';
import { LongPressIOSDirective } from '../../../ui/longpress/longpress-ios.directive';
import { MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { TaskHoverControlsComponent } from './task-hover-controls/task-hover-controls.component';
import { ProgressBarComponent } from '../../../ui/progress-bar/progress-bar.component';
import { TaskListComponent } from '../task-list/task-list.component';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { ShortPlannedAtPipe } from '../../../ui/pipes/short-planned-at.pipe';
import { LocalDateStrPipe } from '../../../ui/pipes/local-date-str.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { IssueIconPipe } from '../../issue/issue-icon/issue-icon.pipe';
import { SubTaskTotalTimeSpentPipe } from '../pipes/sub-task-total-time-spent.pipe';
import { TagListComponent } from '../../tag/tag-list/tag-list.component';
import { ShortDate2Pipe } from '../../../ui/pipes/short-date2.pipe';
import { TagToggleMenuListComponent } from '../../tag/tag-toggle-menu-list/tag-toggle-menu-list.component';
import { Store } from '@ngrx/store';
import { selectTodayTagTaskIds } from '../../tag/store/tag.reducer';
import { planTasksForToday } from '../../tag/store/tag.actions';
import { unScheduleTask } from '../store/task.actions';
import { environment } from '../../../../environments/environment';
import { TODAY_TAG } from '../../tag/tag.const';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';

@Component({
  selector: 'task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation, swirlAnimation, expandInOnlyAnimation],
  /* eslint-disable @typescript-eslint/naming-convention*/
  host: {
    '[id]': 'taskIdWithPrefix()',
    '[tabindex]': '1',
    '[class.isDone]': 'task().isDone',
    '[class.isCurrent]': 'isCurrent()',
    '[class.isSelected]': 'isSelected()',
    '[class.hasNoSubTasks]': 'task().subTaskIds.length === 0',
  },
  imports: [
    MatIcon,
    MatMenuTrigger,
    LongPressIOSDirective,
    MatIconButton,
    TaskTitleComponent,
    TaskHoverControlsComponent,
    ProgressBarComponent,
    MatMiniFabButton,
    forwardRef(() => TaskListComponent),
    TaskContextMenuComponent,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    MsToStringPipe,
    ShortDate2Pipe,
    LocalDateStrPipe,
    TranslatePipe,
    IssueIconPipe,
    SubTaskTotalTimeSpentPipe,
    TagListComponent,
    ShortPlannedAtPipe,
    TagToggleMenuListComponent,
  ],
})
export class TaskComponent implements OnDestroy, AfterViewInit {
  private readonly _taskService = inject(TaskService);
  private readonly _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _configService = inject(GlobalConfigService);
  private readonly _attachmentService = inject(TaskAttachmentService);
  private readonly _elementRef = inject(ElementRef);
  private readonly _renderer = inject(Renderer2);
  private readonly _store = inject(Store);
  private readonly _projectService = inject(ProjectService);
  private readonly _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);
  readonly workContextService = inject(WorkContextService);

  task = input.required<TaskWithSubTasks>();
  isBacklog = input<boolean>(false);
  isInSubTaskList = input<boolean>(false);

  // computed
  currentId = toSignal(this._taskService.currentTaskId$);
  isCurrent = computed(() => this.currentId() === this.task().id);
  selectedId = toSignal(this._taskService.selectedTaskId$);
  isSelected = computed(() => this.selectedId() === this.task().id);
  todayStr = toSignal(this._globalTrackingIntervalService.todayDateStr$);

  todayList = toSignal(this._store.select(selectTodayTagTaskIds), { initialValue: [] });
  isTaskOnTodayList = computed(() => this.todayList().includes(this.task().id));
  isTodayListActive = computed(() => this.workContextService.isToday);
  taskIdWithPrefix = computed(() => 't-' + this.task().id);
  isRepeatTaskCreatedToday = computed(
    () => !!(this.task().repeatCfgId && isToday(this.task().created)),
  );
  isOverdue = computed(() => {
    const t = this.task();
    return (
      !t.isDone &&
      ((t.dueWithTime && t.dueWithTime < Date.now()) ||
        (t.dueDay && !isToday(new Date(t.dueDay)) && new Date(t.dueDay) < new Date()))
    );
  });
  isScheduledToday = computed(() => {
    const t = this.task();
    return (
      (t.dueWithTime && isToday(t.dueWithTime)) ||
      (t.dueDay && t.dueDay === this.todayStr())
    );
  });

  isShowDueDayBtn = computed(() => {
    return (
      this.task().dueDay &&
      (!this.isTodayListActive() ||
        this.isOverdue() ||
        this.task().dueDay !== this.todayStr() ||
        !environment.production)
    );
  });

  progress = computed<number>(() => {
    const t = this.task();
    return (t.timeEstimate && (t.timeSpent / t.timeEstimate) * 100) || 0;
  });

  isShowRemoveFromToday = computed(() => {
    return (
      !this.isTodayListActive() &&
      !this.task().isDone &&
      this.task().dueDay === this.todayStr()
    );
  });

  isShowAddToToday = computed(() => {
    const task = this.task();
    return this.isTodayListActive()
      ? (task.dueWithTime && !isToday(task.dueWithTime)) ||
          (task.dueDay && task.dueDay !== this.todayStr())
      : !this.isShowRemoveFromToday() &&
          task.dueDay !== this.todayStr() &&
          (!task.dueWithTime || !isToday(task.dueWithTime));
  });

  T: typeof T = T;
  IS_TOUCH_PRIMARY: boolean = IS_TOUCH_PRIMARY;
  isDragOver: boolean = false;
  isLockPanLeft: boolean = false;
  isLockPanRight: boolean = false;
  isPreventPointerEventsWhilePanning: boolean = false;
  isActionTriggered: boolean = false;
  ShowSubTasksMode: typeof HideSubTasksMode = HideSubTasksMode;
  isFirstLineHover: boolean = false;
  _nextFocusTaskEl?: HTMLElement;

  readonly taskTitleEditEl = viewChild<TaskTitleComponent>('taskTitleEditEl');
  readonly blockLeftElRef = viewChild<ElementRef>('blockLeftEl');
  readonly blockRightElRef = viewChild<ElementRef>('blockRightEl');
  readonly innerWrapperElRef = viewChild<ElementRef>('innerWrapperEl');
  readonly projectMenuTrigger = viewChild('projectMenuTriggerEl', {
    read: MatMenuTrigger,
  });
  readonly tagToggleMenuList = viewChild('tagToggleMenuList', {
    read: TagToggleMenuListComponent,
  });
  readonly taskContextMenu = viewChild('taskContextMenu', {
    read: TaskContextMenuComponent,
  });

  private _task$ = toObservable(this.task);

  moveToProjectList = toSignal(
    this._task$.pipe(
      map((t) => t.projectId),
      distinctUntilChanged(),
      switchMap((pid) => this._projectService.getProjectsWithoutId$(pid || null)),
    ),
  );

  parentTask = toSignal(
    this._task$.pipe(
      switchMap((task) =>
        task.parentId ? this._taskService.getByIdLive$(task.parentId) : of(null),
      ),
    ),
  );
  parentTitle = computed(() => this.parentTask()?.title ?? null);

  private _dragEnterTarget?: HTMLElement;
  private _currentPanTimeout?: number;
  private _doubleClickTimeout?: number;
  private _isTaskDeleteTriggered = false;

  // methods come last
  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent): void {
    this._handleKeyboardShortcuts(ev);
  }

  @HostListener('dragenter', ['$event']) onDragEnter(ev: DragEvent): void {
    this._dragEnterTarget = ev.target as HTMLElement;
    ev.preventDefault();
    ev.stopPropagation();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(ev: DragEvent): void {
    if (this._dragEnterTarget === (ev.target as HTMLElement)) {
      ev.preventDefault();
      ev.stopPropagation();
      this.isDragOver = false;
    }
  }

  @HostListener('drop', ['$event']) onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.focusSelf();
    this._attachmentService.createFromDrop(ev, this.task().id);
    ev.stopPropagation();
    this.isDragOver = false;
  }

  // NOTE: this prevents dragging on mobile for no touch area
  onTouchStart(ev: TouchEvent): void {
    if (!ev.target || !(ev.target as HTMLElement).classList?.contains('drag-handle')) {
      ev.stopPropagation();
    }
  }

  ngAfterViewInit(): void {
    // TODO remove
    if (!environment.production) {
      if (this.task().tagIds.includes(TODAY_TAG.id)) {
        throw new Error('Task should not have today tag');
      }
    }

    // hacky but relatively performant
    const t = this.task();
    if (t.parentId && !t.title.length && Date.now() - 200 < t.created) {
      setTimeout(() => {
        // when there are multiple instances with the same task we should focus the last one, since it is the one in the
        // task side panel
        const otherTaskEl = document.querySelectorAll('#t-' + t.id);
        if (
          otherTaskEl?.length <= 1 ||
          Array.from(otherTaskEl).findIndex(
            (item) => item === this._elementRef.nativeElement,
          ) ===
            otherTaskEl.length - 1
        ) {
          this.focusTitleForEdit();
        }
      });
    }
  }

  ngOnDestroy(): void {
    window.clearTimeout(this._currentPanTimeout);
    window.clearTimeout(this._doubleClickTimeout);
  }

  scheduleTask(): void {
    this._storeNextFocusEl();
    this._matDialog
      .open(DialogScheduleTaskComponent, {
        // we focus inside dialog instead
        autoFocus: false,
        data: { task: this.task() },
      })
      .afterClosed()
      .subscribe((isPlanned) => {
        this.focusSelfOrNextIfNotPossible();
      });
  }

  editTaskRepeatCfg(): void {
    this._matDialog
      .open(DialogEditTaskRepeatCfgComponent, {
        data: {
          task: this.task(),
        },
      })
      .afterClosed()
      .subscribe(() => this.focusSelf());
  }

  deleteTask(isClick: boolean = false): void {
    // NOTE: prevents attempts to delete the same task multiple times
    if (this._isTaskDeleteTriggered) {
      return;
    }
    // NOTE: in case we want the focus behaviour on click we could use:
    // this.focusSelf();
    if (!isClick) {
      this.focusNext(true);
    }

    this._isTaskDeleteTriggered = true;
    this._taskService.remove(this.task());
  }

  startTask(): void {
    this._taskService.setCurrentId(this.task().id);
    this.focusSelf();
  }

  pauseTask(): void {
    this._taskService.pauseCurrent();
  }

  updateTaskTitleIfChanged({
    newVal,
    wasChanged,
  }: {
    newVal: string;
    wasChanged: boolean;
  }): void {
    if (wasChanged) {
      this._taskService.update(this.task().id, { title: newVal });
    }
    this.focusSelf();
  }

  estimateTime(): void {
    this._matDialog
      .open(DialogTimeEstimateComponent, {
        data: { task: this.task() },
        autoFocus: !IS_TOUCH_PRIMARY,
      })
      .afterClosed()
      .subscribe(() => this.focusSelf());
  }

  addAttachment(): void {
    this._matDialog
      .open(DialogEditTaskAttachmentComponent, {
        data: {},
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this._attachmentService.addAttachment(this.task().id, result);
        }
        this.focusSelf();
      });
  }

  addSubTask(): void {
    this._taskService.addSubTaskTo(this.task().parentId || this.task().id);
  }

  @throttle(200, { leading: true, trailing: false })
  toggleDoneKeyboard(): void {
    this.toggleTaskDone();
  }

  toggleTaskDone(): void {
    this.focusNext(true, true);

    if (this.task().isDone) {
      this._taskService.setUnDone(this.task().id);
    } else {
      this._taskService.setDone(this.task().id);
    }
  }

  showDetailPanel(): void {
    this._taskService.setSelectedId(this.task().id);
    this.focusSelf();
  }

  hideDetailPanel(): void {
    this._taskService.setSelectedId(this.task().id);
    this.focusSelf();
  }

  private _wasClickedInDoubleClickRange = false;

  toggleShowDetailPanel(ev?: MouseEvent): void {
    const isInTaskDetailPanel =
      this._elementRef.nativeElement.closest('task-detail-panel');
    if (isInTaskDetailPanel && !this._wasClickedInDoubleClickRange) {
      this._wasClickedInDoubleClickRange = true;
      window.clearTimeout(this._doubleClickTimeout);
      this._doubleClickTimeout = window.setTimeout(() => {
        this._wasClickedInDoubleClickRange = false;
      }, 400);
      return;
    }

    if (this.isSelected()) {
      this._taskService.setSelectedId(null);
    } else {
      this._taskService.setSelectedId(this.task().id);
    }
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  toggleShowAttachments(): void {
    this._taskService.setSelectedId(this.task().id, TaskDetailTargetPanel.Attachments);
    this.focusSelf();
  }

  toggleSubTaskMode(): void {
    this._taskService.toggleSubTaskMode(this.task().id, true, true);
    this.focusSelf();
  }

  isTagMenuVisible = signal(false);

  async editTags(): Promise<void> {
    this.isTagMenuVisible.set(true);
    setTimeout(() => {
      this.tagToggleMenuList()?.openMenu();
    });

    // this._matDialog
    //   .open(DialogEditTagsForTaskComponent, {
    //     data: {
    //       task: this.task(),
    //     },
    //   })
    //   .afterClosed()
    //   .subscribe(() => this.focusSelf());
  }

  toggleTag(tagId: string): void {
    const task = this.task();
    const tagIds = task.tagIds.includes(tagId)
      ? task.tagIds.filter((id) => id !== tagId)
      : [...task.tagIds, tagId];

    this.onTagsUpdated(tagIds);
  }

  addToMyDay(): void {
    this._store.dispatch(planTasksForToday({ taskIds: [this.task().id] }));
  }

  unschedule(): void {
    this._store.dispatch(
      unScheduleTask({ id: this.task().id, reminderId: this.task().reminderId }),
    );
  }

  focusPrevious(isFocusReverseIfNotPossible: boolean = false): void {
    if (IS_TOUCH_PRIMARY) {
      return;
    }

    const taskEls = Array.from(document.querySelectorAll('task'));
    const activeEl =
      document.activeElement?.tagName.toLowerCase() === 'task'
        ? document.activeElement
        : document.activeElement?.closest('task');
    const currentIndex = taskEls.findIndex((el) => el === activeEl);
    const prevEl = taskEls[currentIndex - 1] as HTMLElement;

    if (prevEl) {
      prevEl.focus();
      // hacky but works
      setTimeout(() => {
        if (document.activeElement !== prevEl) {
          prevEl.focus();
        }
      });
    } else if (isFocusReverseIfNotPossible) {
      this.focusNext();
    }
  }

  focusNext(
    isFocusReverseIfNotPossible: boolean = false,
    isTaskMovedInList = false,
  ): void {
    if (IS_TOUCH_PRIMARY) {
      return;
    }

    const nextEl = this._getNextFocusEl(isTaskMovedInList);
    this._nextFocusTaskEl = undefined;

    if (nextEl) {
      nextEl.focus();
      // hacky but works
      setTimeout(() => {
        if (document.activeElement !== nextEl) {
          nextEl.focus();
        }
      });
    } else if (isFocusReverseIfNotPossible) {
      this.focusPrevious();
    }
  }

  focusSelf(): void {
    if (IS_TOUCH_PRIMARY) {
      return;
    }
    this.focusSelfElement();
  }

  focusSelfOrNextIfNotPossible(): void {
    if (IS_TOUCH_PRIMARY) {
      return;
    }

    this.focusSelf();
    // we don't clear the timeout since this should be executed if task is gone
    window.setTimeout(() => {
      if (
        !document.activeElement ||
        document.activeElement.tagName.toLowerCase() !== 'task'
      ) {
        this.focusNext(true);
      }
    }, 200);
  }

  focusSelfElement(): void {
    this._elementRef.nativeElement.focus();
  }

  focusTitleForEdit(): void {
    const taskTitleEditEl = this.taskTitleEditEl();
    if (!taskTitleEditEl || !taskTitleEditEl.textarea().nativeElement) {
      console.log(taskTitleEditEl);
      throw new Error('No el');
    }
    taskTitleEditEl.textarea().nativeElement.focus();
    //  (this.taskTitleEditEl as any).textarea.nativeElement.focus();
  }

  openContextMenu(event: TouchEvent | MouseEvent): void {
    (this.taskTitleEditEl() as any).textarea.nativeElement?.blur();
    this.taskContextMenu()?.open(event);
  }

  onTagsUpdated(tagIds: string[]): void {
    this._taskService.updateTags(this.task(), tagIds);
  }

  onPanStart(ev: any): void {
    if (!IS_TOUCH_PRIMARY) {
      return;
    }
    const taskTitleEditEl = this.taskTitleEditEl();
    if (!taskTitleEditEl) {
      throw new Error('No el');
    }

    this._resetAfterPan();
    const targetEl: HTMLElement = ev.target as HTMLElement;
    if (
      (targetEl.className.indexOf && targetEl.className.indexOf('drag-handle') > -1) ||
      Math.abs(ev.deltaY) > Math.abs(ev.deltaX) ||
      document.activeElement === (taskTitleEditEl as any).textarea.nativeElement ||
      ev.isFinal
    ) {
      return;
    }
    if (ev.deltaX > 0) {
      this.isLockPanRight = true;
    } else if (ev.deltaX < 0) {
      this.isLockPanLeft = true;
    }
  }

  onPanEnd(): void {
    if (!IS_TOUCH_PRIMARY || (!this.isLockPanLeft && !this.isLockPanRight)) {
      return;
    }
    const blockLeftElRef = this.blockLeftElRef();
    const blockRightElRef = this.blockRightElRef();
    if (!blockLeftElRef || !blockRightElRef) {
      throw new Error('No el');
    }

    this.isPreventPointerEventsWhilePanning = false;
    this._renderer.removeStyle(blockLeftElRef.nativeElement, 'transition');
    this._renderer.removeStyle(blockRightElRef.nativeElement, 'transition');

    if (this._currentPanTimeout) {
      window.clearTimeout(this._currentPanTimeout);
    }

    if (this.isActionTriggered) {
      if (this.isLockPanLeft) {
        this._renderer.setStyle(blockRightElRef.nativeElement, 'transform', `scaleX(1)`);
        this._currentPanTimeout = window.setTimeout(() => {
          if (this.task().repeatCfgId) {
            this.editTaskRepeatCfg();
          } else {
            this.scheduleTask();
          }

          this._resetAfterPan();
        }, 100);
      } else if (this.isLockPanRight) {
        this._renderer.setStyle(blockLeftElRef.nativeElement, 'transform', `scaleX(1)`);
        this._currentPanTimeout = window.setTimeout(() => {
          this.toggleTaskDone();
          this._resetAfterPan();
        }, 100);
      }
    } else {
      this._resetAfterPan();
    }
  }

  onPanLeft(ev: any): void {
    this._handlePan(ev);
  }

  onPanRight(ev: any): void {
    this._handlePan(ev);
  }

  // TODO extract so service
  moveTaskToProject(projectId: string): void {
    const t = this.task();
    if (projectId === t.projectId) {
      return;
    } else if (!t.repeatCfgId) {
      this._taskService.moveToProject(t, projectId);
    } else {
      forkJoin([
        this._taskRepeatCfgService.getTaskRepeatCfgById$(t.repeatCfgId).pipe(first()),
        this._taskService.getTasksWithSubTasksByRepeatCfgId$(t.repeatCfgId).pipe(first()),
        this._taskService.getArchiveTasksForRepeatCfgId(t.repeatCfgId),
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
                this._taskService.moveToProject(this.task(), projectId);
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
        .subscribe(() => this.focusSelf());
    }
  }

  moveToBacklog(): void {
    const t = this.task();
    if (t.projectId && !t.parentId) {
      this._projectService.moveTaskToBacklog(t.id, t.projectId);
      if (this.isTaskOnTodayList()) {
        this.unschedule();
      }
    }
  }

  moveToToday(): void {
    const t = this.task();
    if (t.projectId) {
      this._projectService.moveTaskToTodayList(t.id, t.projectId);
      this.addToMyDay();
    }
  }

  trackByProjectId(i: number, project: Project): string {
    return project.id;
  }

  private _storeNextFocusEl(): void {
    this._nextFocusTaskEl = this._getNextFocusEl();
  }

  private _getNextFocusEl(isTaskMovedInList = false): HTMLElement | undefined {
    if (this._nextFocusTaskEl) {
      return this._nextFocusTaskEl;
    }

    const taskEls = Array.from(document.querySelectorAll('task'));
    const activeEl =
      document.activeElement?.tagName.toLowerCase() === 'task'
        ? document.activeElement
        : document.activeElement?.closest('task');
    const currentIndex = taskEls.findIndex((el) => el === activeEl);
    const nextEl = isTaskMovedInList
      ? (() => {
          // if a parent task is moved in list, as it is for when toggling done,
          // we don't want to focus the next sub-task, but the next main task instead
          if (this.task().subTaskIds.length) {
            return taskEls.find((el, i) => {
              return i > currentIndex && el.parentElement?.closest('task');
            }) as HTMLElement | undefined;
          }
          return taskEls[currentIndex + 1] as HTMLElement;
        })()
      : (taskEls[currentIndex + 1] as HTMLElement);
    return nextEl;
  }

  private _handlePan(ev: any): void {
    if (
      !IS_TOUCH_PRIMARY ||
      (!this.isLockPanLeft && !this.isLockPanRight) ||
      ev.eventType === 8
    ) {
      return;
    }
    const innerWrapperElRef = this.innerWrapperElRef();
    if (!innerWrapperElRef) {
      throw new Error('No el');
    }

    const targetRef = this.isLockPanRight
      ? this.blockLeftElRef()
      : this.blockRightElRef();

    const MAGIC_FACTOR = 2;
    this.isPreventPointerEventsWhilePanning = true;
    //  (this.task()TitleEditEl as any).textarea.nativeElement.blur();
    if (targetRef) {
      let scale = (ev.deltaX / this._elementRef.nativeElement.offsetWidth) * MAGIC_FACTOR;
      scale = this.isLockPanLeft ? scale * -1 : scale;
      scale = Math.min(1, Math.max(0, scale));
      if (scale > 0.5) {
        this.isActionTriggered = true;
        this._renderer.addClass(targetRef.nativeElement, 'isActive');
      } else {
        this.isActionTriggered = false;
        this._renderer.removeClass(targetRef.nativeElement, 'isActive');
      }
      const moveBy = this.isLockPanLeft ? ev.deltaX * -1 : ev.deltaX;
      this._renderer.setStyle(targetRef.nativeElement, 'width', `${moveBy}px`);
      this._renderer.setStyle(targetRef.nativeElement, 'transition', `none`);
      this._renderer.setStyle(
        innerWrapperElRef.nativeElement,
        'transform',
        `translateX(${ev.deltaX}px`,
      );
    }
  }

  private _resetAfterPan(): void {
    const blockLeftElRef = this.blockLeftElRef();
    const blockRightElRef = this.blockRightElRef();
    const innerWrapperElRef = this.innerWrapperElRef();
    if (
      !this.taskTitleEditEl() ||
      !blockLeftElRef ||
      !blockRightElRef ||
      !innerWrapperElRef
    ) {
      throw new Error('No el');
    }

    this.isPreventPointerEventsWhilePanning = false;
    this.isActionTriggered = false;
    this.isLockPanLeft = false;
    this.isLockPanRight = false;
    // const scale = 0;
    // this._renderer.setStyle(this.blockLeftEl.nativeElement, 'transform', `scaleX(${scale})`);
    // this._renderer.setStyle(this.blockRightEl.nativeElement, 'transform', `scaleX(${scale})`);
    this._renderer.removeClass(blockLeftElRef.nativeElement, 'isActive');
    this._renderer.removeClass(blockRightElRef.nativeElement, 'isActive');
    this._renderer.setStyle(innerWrapperElRef.nativeElement, 'transform', ``);
  }

  get kb(): KeyboardConfig {
    if (IS_TOUCH_PRIMARY) {
      return {} as any;
    }
    return (this._configService.cfg?.keyboard as KeyboardConfig) || {};
  }

  private _handleKeyboardShortcuts(ev: KeyboardEvent): void {
    if (ev.target !== this._elementRef.nativeElement) {
      return;
    }

    const t = this.task();
    const cfg = this._configService.cfg;
    if (!cfg) {
      throw new Error();
    }
    const keys = cfg.keyboard;
    const isShiftOrCtrlPressed = ev.shiftKey || ev.ctrlKey;

    if (checkKeyCombo(ev, keys.taskEditTitle) || ev.key === 'Enter') {
      this.focusTitleForEdit();
      // prevent blur
      ev.preventDefault();
    }
    if (checkKeyCombo(ev, keys.taskToggleDetailPanelOpen)) {
      this.toggleShowDetailPanel();
    }
    if (checkKeyCombo(ev, keys.taskOpenEstimationDialog)) {
      this.estimateTime();
    }
    if (checkKeyCombo(ev, keys.taskSchedule)) {
      this.scheduleTask();
    }
    if (checkKeyCombo(ev, keys.taskToggleDone)) {
      this.toggleDoneKeyboard();
    }
    if (checkKeyCombo(ev, keys.taskAddSubTask)) {
      this.addSubTask();
    }
    if (checkKeyCombo(ev, keys.taskAddAttachment)) {
      this.addAttachment();
    }
    if (!t.parentId && checkKeyCombo(ev, keys.taskMoveToProject)) {
      const projectMenuTrigger = this.projectMenuTrigger();
      if (!projectMenuTrigger) {
        throw new Error('No el');
      }
      projectMenuTrigger.openMenu();
    }
    if (checkKeyCombo(ev, keys.taskOpenContextMenu)) {
      const taskContextMenu = this.taskContextMenu();
      if (!taskContextMenu) {
        throw new Error('No el');
      }
      taskContextMenu.open(ev, true);
    }

    if (checkKeyCombo(ev, keys.togglePlay)) {
      if (this.isCurrent()) {
        this.pauseTask();
      } else {
        this.startTask();
      }
    }
    if (checkKeyCombo(ev, keys.taskEditTags)) {
      this.editTags();
    }
    if (checkKeyCombo(ev, keys.taskDelete)) {
      this.deleteTask();
    }

    if (checkKeyCombo(ev, keys.moveToBacklog) && t.projectId) {
      if (!t.parentId) {
        ev.preventDefault();
        // same default shortcut as schedule so we stop propagation
        ev.stopPropagation();
        this.focusPrevious(true);
        this.moveToBacklog();
      }
    }

    if (checkKeyCombo(ev, keys.moveToTodaysTasks) && t.projectId) {
      ev.preventDefault();
      // same default shortcut as schedule so we stop propagation
      ev.stopPropagation();
      this.focusNext(true, true);
      this.moveToToday();
    }

    // collapse sub tasks
    if (ev.key === 'ArrowLeft' || checkKeyCombo(ev, keys.collapseSubTasks)) {
      const hasSubTasks = t.subTasks && (t.subTasks as any).length > 0;
      if (this.isSelected()) {
        this.hideDetailPanel();
      } else if (hasSubTasks && t._hideSubTasksMode !== HideSubTasksMode.HideAll) {
        this._taskService.toggleSubTaskMode(t.id, true, false);
        // TODO find a solution
        // } else if (this.task.parentId) {
        // this._taskService.focusTask(this.task.parentId);
      } else {
        this.focusPrevious();
      }
    }

    // expand sub tasks
    if (ev.key === 'ArrowRight' || checkKeyCombo(ev, keys.expandSubTasks)) {
      const hasSubTasks = t.subTasks && (t.subTasks as any).length > 0;
      if (hasSubTasks && t._hideSubTasksMode !== undefined) {
        this._taskService.toggleSubTaskMode(t.id, false, false);
      } else if (!this.isSelected()) {
        this.showDetailPanel();
      } else {
        this.focusNext();
      }
    }

    // moving items
    // move task up
    if (checkKeyCombo(ev, keys.moveTaskUp)) {
      this._taskService.moveUp(t.id, t.parentId, this.isBacklog());
      ev.stopPropagation();
      ev.preventDefault();
      // timeout required to let changes take place @TODO hacky
      setTimeout(this.focusSelf.bind(this));
      setTimeout(this.focusSelf.bind(this), 10);
      return;
    }

    if (checkKeyCombo(ev, keys.moveTaskDown)) {
      this._taskService.moveDown(t.id, t.parentId, this.isBacklog());
      // timeout required to let changes take place @TODO hacky
      setTimeout(this.focusSelf.bind(this));
      setTimeout(this.focusSelf.bind(this), 10);
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }

    if (checkKeyCombo(ev, keys.moveTaskToTop)) {
      this._taskService.moveToTop(t.id, t.parentId, this.isBacklog());
      ev.stopPropagation();
      ev.preventDefault();
      // timeout required to let changes take place @TODO hacky
      setTimeout(this.focusSelf.bind(this));
      setTimeout(this.focusSelf.bind(this), 10);
      return;
    }

    if (checkKeyCombo(ev, keys.moveTaskToBottom)) {
      this._taskService.moveToBottom(t.id, t.parentId, this.isBacklog());
      ev.stopPropagation();
      ev.preventDefault();
      // timeout required to let changes take place @TODO hacky
      setTimeout(this.focusSelf.bind(this));
      setTimeout(this.focusSelf.bind(this), 10);
      return;
    }

    // move focus up
    if (
      (!isShiftOrCtrlPressed && ev.key === 'ArrowUp') ||
      checkKeyCombo(ev, keys.selectPreviousTask)
    ) {
      ev.preventDefault();
      this.focusPrevious();
    }
    // move focus down
    if (
      (!isShiftOrCtrlPressed && ev.key === 'ArrowDown') ||
      checkKeyCombo(ev, keys.selectNextTask)
    ) {
      ev.preventDefault();
      this.focusNext();
    }
  }

  protected readonly ICAL_TYPE = ICAL_TYPE;
}
