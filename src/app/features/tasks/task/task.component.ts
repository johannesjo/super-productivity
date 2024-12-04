import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  input,
  OnDestroy,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { TaskService } from '../task.service';
import { EMPTY, forkJoin, of } from 'rxjs';
import {
  ShowSubTasksMode,
  TaskCopy,
  TaskDetailTargetPanel,
  TaskWithSubTasks,
} from '../task.model';
import { MatDialog } from '@angular/material/dialog';
import { DialogTimeEstimateComponent } from '../dialog-time-estimate/dialog-time-estimate.component';
import { expandAnimation } from '../../../ui/animations/expand.ani';
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
import { MatMenuTrigger } from '@angular/material/menu';
import { TODAY_TAG } from '../../tag/tag.const';
import { DialogEditTagsForTaskComponent } from '../../tag/dialog-edit-tags/dialog-edit-tags-for-task.component';
import { WorkContextService } from '../../work-context/work-context.service';
import { throttle } from 'helpful-decorators';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { Update } from '@ngrx/entity';
import { SnackService } from '../../../core/snack/snack.service';
import { isToday } from '../../../util/is-today.util';
import {
  isShowRemoveFromToday,
  isShowAddToToday,
  isTodayTag,
} from '../util/is-task-today';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { KeyboardConfig } from '../../config/keyboard-config.model';
import { DialogScheduleTaskComponent } from '../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { PlannerService } from '../../planner/planner.service';
import { TaskContextMenuComponent } from '../task-context-menu/task-context-menu.component';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ICAL_TYPE } from '../../issue/issue.const';

@Component({
  selector: 'task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation, swirlAnimation],
  /* eslint-disable @typescript-eslint/naming-convention*/
  host: {
    '[id]': 'taskIdWithPrefix()',
    '[tabindex]': '1',
    '[class.isDone]': 'task().isDone',
    '[class.isCurrent]': 'isCurrent()',
    '[class.isSelected]': 'isSelected()',
    '[class.hasNoSubTasks]': 'task().subTaskIds.length === 0',
  },

  /* eslint-enable @typescript-eslint/naming-convention*/
})
export class TaskComponent implements OnDestroy, AfterViewInit {
  task = input.required<TaskWithSubTasks>();
  isBacklog = input<boolean>(false);
  isInSubTaskList = input<boolean>(false);

  // computed
  currentId = toSignal(this._taskService.currentTaskId$);
  isCurrent = computed(() => this.currentId() === this.task().id);
  selectedId = toSignal(this._taskService.selectedTaskId$);
  isSelected = computed(() => this.selectedId() === this.task().id);

  isTodayTag = computed(() => isTodayTag(this.task()));
  isTodayListActive = computed(() => this.workContextService.isToday);
  taskIdWithPrefix = computed(() => 't-' + this.task().id);
  isRepeatTaskCreatedToday = computed(
    () => !!(this.task().repeatCfgId && isToday(this.task().created)),
  );

  progress = computed<number>(() => {
    const t = this.task();
    return (t.timeEstimate && (t.timeSpent / t.timeEstimate) * 100) || 0;
  });

  T: typeof T = T;
  IS_TOUCH_PRIMARY: boolean = IS_TOUCH_PRIMARY;
  isDragOver: boolean = false;
  isLockPanLeft: boolean = false;
  isLockPanRight: boolean = false;
  isPreventPointerEventsWhilePanning: boolean = false;
  isActionTriggered: boolean = false;
  ShowSubTasksMode: typeof ShowSubTasksMode = ShowSubTasksMode;
  isFirstLineHover: boolean = false;

  @ViewChild('taskTitleEditEl', { static: true }) taskTitleEditEl?: ElementRef;
  @ViewChild('blockLeftEl') blockLeftElRef?: ElementRef;
  @ViewChild('blockRightEl') blockRightElRef?: ElementRef;
  @ViewChild('innerWrapperEl', { static: true }) innerWrapperElRef?: ElementRef;
  @ViewChild('projectMenuTriggerEl', { static: false, read: MatMenuTrigger })
  projectMenuTrigger?: MatMenuTrigger;
  @ViewChild('taskContextMenu', { static: true, read: TaskContextMenuComponent })
  taskContextMenu?: TaskContextMenuComponent;

  private _task$ = toObservable(this.task);

  moveToProjectList = toSignal(
    this._task$.pipe(
      map((t) => t.projectId),
      distinctUntilChanged(),
      switchMap((pid) => this._projectService.getProjectsWithoutId$(pid)),
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
  private _isTaskDeleteTriggered = false;

  constructor(
    private readonly _taskService: TaskService,
    private readonly _taskRepeatCfgService: TaskRepeatCfgService,
    private readonly _matDialog: MatDialog,
    private readonly _configService: GlobalConfigService,
    private readonly _attachmentService: TaskAttachmentService,
    private readonly _elementRef: ElementRef,
    private readonly _snackService: SnackService,
    private readonly _renderer: Renderer2,
    private readonly _projectService: ProjectService,
    public readonly plannerService: PlannerService,
    public readonly workContextService: WorkContextService,
  ) {}

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
  }

  isShowRemoveFromToday(): boolean {
    return isShowRemoveFromToday(this.task());
  }
  isShowAddToToday(): boolean {
    return isShowAddToToday(this.task(), this.workContextService.isToday);
  }

  scheduleTask(): void {
    this._matDialog
      .open(DialogScheduleTaskComponent, {
        // we focus inside dialog instead
        autoFocus: false,
        data: { task: this.task() },
      })
      .afterClosed()
      // .pipe(takeUntil(this._destroy$))
      .subscribe((isPlanned) => {
        if (isPlanned) {
          this.focusNext(true);
        } else {
          this.focusSelf();
        }
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

  toggleShowDetailPanel(ev?: MouseEvent): void {
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

  async editTags(): Promise<void> {
    this._matDialog
      .open(DialogEditTagsForTaskComponent, {
        data: {
          task: this.task(),
        },
      })
      .afterClosed()
      .subscribe(() => this.focusSelf());
  }

  addToMyDay(): void {
    this._taskService.addTodayTag(this.task());
  }

  removeFromMyDay(): void {
    this.onTagsUpdated(this.task().tagIds.filter((tagId) => tagId !== TODAY_TAG.id));
  }

  convertToMainTask(): void {
    this._taskService.convertToMainTask(this.task());
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
    // this._taskService.focusTask(this.task().id);
  }

  focusSelfElement(): void {
    this._elementRef.nativeElement.focus();
  }

  focusTitleForEdit(): void {
    if (!this.taskTitleEditEl || !(this.taskTitleEditEl as any).textarea.nativeElement) {
      console.log(this.taskTitleEditEl);
      throw new Error('No el');
    }
    (this.taskTitleEditEl as any).textarea.nativeElement.focus();
    //  (this.taskTitleEditEl as any).textarea.nativeElement.focus();
  }

  openContextMenu(event: TouchEvent | MouseEvent): void {
    (this.taskTitleEditEl as any).textarea.nativeElement?.blur();
    this.taskContextMenu?.open(event);
  }

  onTagsUpdated(tagIds: string[]): void {
    this._taskService.updateTags(this.task(), tagIds);
  }

  onPanStart(ev: any): void {
    if (!IS_TOUCH_PRIMARY) {
      return;
    }
    if (!this.taskTitleEditEl) {
      throw new Error('No el');
    }

    this._resetAfterPan();
    const targetEl: HTMLElement = ev.target as HTMLElement;
    if (
      (targetEl.className.indexOf && targetEl.className.indexOf('drag-handle') > -1) ||
      Math.abs(ev.deltaY) > Math.abs(ev.deltaX) ||
      document.activeElement === (this.taskTitleEditEl as any).textarea.nativeElement ||
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
    if (!this.blockLeftElRef || !this.blockRightElRef) {
      throw new Error('No el');
    }

    this.isPreventPointerEventsWhilePanning = false;
    this._renderer.removeStyle(this.blockLeftElRef.nativeElement, 'transition');
    this._renderer.removeStyle(this.blockRightElRef.nativeElement, 'transition');

    if (this._currentPanTimeout) {
      window.clearTimeout(this._currentPanTimeout);
    }

    if (this.isActionTriggered) {
      if (this.isLockPanLeft) {
        this._renderer.setStyle(
          this.blockRightElRef.nativeElement,
          'transform',
          `scaleX(1)`,
        );
        this._currentPanTimeout = window.setTimeout(() => {
          if (this.workContextService.isToday) {
            if (this.task().repeatCfgId) {
              this.editTaskRepeatCfg();
            } else {
              this.scheduleTask();
            }
          } else {
            if (this.task().parentId) {
              // NOTHING
            } else {
              if (this.task().tagIds.includes(TODAY_TAG.id)) {
                this.removeFromMyDay();
              } else {
                this.addToMyDay();
              }
            }
          }
          this._resetAfterPan();
        }, 100);
      } else if (this.isLockPanRight) {
        this._renderer.setStyle(
          this.blockLeftElRef.nativeElement,
          'transform',
          `scaleX(1)`,
        );
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
      if (t.tagIds.includes(TODAY_TAG.id)) {
        this.removeFromMyDay();
      }
    }
  }

  moveToToday(): void {
    const t = this.task();
    if (t.projectId && !t.parentId) {
      this._projectService.moveTaskToTodayList(t.id, t.projectId);
      this.addToMyDay();
    }
  }

  trackByProjectId(i: number, project: Project): string {
    return project.id;
  }

  private _handlePan(ev: any): void {
    if (
      !IS_TOUCH_PRIMARY ||
      (!this.isLockPanLeft && !this.isLockPanRight) ||
      ev.eventType === 8
    ) {
      return;
    }
    if (!this.innerWrapperElRef) {
      throw new Error('No el');
    }

    const targetRef = this.isLockPanRight ? this.blockLeftElRef : this.blockRightElRef;

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
        this.innerWrapperElRef.nativeElement,
        'transform',
        `translateX(${ev.deltaX}px`,
      );
    }
  }

  private _resetAfterPan(): void {
    if (
      !this.taskTitleEditEl ||
      !this.blockLeftElRef ||
      !this.blockRightElRef ||
      !this.innerWrapperElRef
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
    this._renderer.removeClass(this.blockLeftElRef.nativeElement, 'isActive');
    this._renderer.removeClass(this.blockRightElRef.nativeElement, 'isActive');
    this._renderer.setStyle(this.innerWrapperElRef.nativeElement, 'transform', ``);
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
      if (!this.projectMenuTrigger) {
        throw new Error('No el');
      }
      this.projectMenuTrigger.openMenu();
    }
    if (checkKeyCombo(ev, keys.taskOpenContextMenu)) {
      if (!this.taskContextMenu) {
        throw new Error('No el');
      }
      this.taskContextMenu.open(ev, true);
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
      if (!t.parentId) {
        ev.preventDefault();
        // same default shortcut as schedule so we stop propagation
        ev.stopPropagation();
        this.focusNext(true, true);
        this.moveToToday();
      }
    }

    // collapse sub tasks
    if (ev.key === 'ArrowLeft' || checkKeyCombo(ev, keys.collapseSubTasks)) {
      const hasSubTasks = t.subTasks && (t.subTasks as any).length > 0;
      if (this.isSelected()) {
        this.hideDetailPanel();
      } else if (hasSubTasks && t._showSubTasksMode !== ShowSubTasksMode.HideAll) {
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
      if (hasSubTasks && t._showSubTasksMode !== ShowSubTasksMode.Show) {
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
