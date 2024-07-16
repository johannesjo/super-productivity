import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { TaskService } from '../task.service';
import { EMPTY, forkJoin, Observable, of, ReplaySubject, Subject } from 'rxjs';
import {
  ShowSubTasksMode,
  TaskAdditionalInfoTargetPanel,
  TaskCopy,
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
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { TaskAttachmentService } from '../task-attachment/task-attachment.service';
import { IssueService } from '../../issue/issue.service';
import { DialogEditTaskAttachmentComponent } from '../task-attachment/dialog-edit-attachment/dialog-edit-task-attachment.component';
import { swirlAnimation } from '../../../ui/animations/swirl-in-out.ani';
import { DialogAddTaskReminderComponent } from '../dialog-add-task-reminder/dialog-add-task-reminder.component';
import { DialogEditTaskRepeatCfgComponent } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { ProjectService } from '../../project/project.service';
import { Project } from '../../project/project.model';
import { T } from '../../../t.const';
import { MatMenuTrigger } from '@angular/material/menu';
import { AddTaskReminderInterface } from '../dialog-add-task-reminder/add-task-reminder-interface';
import { TODAY_TAG } from '../../tag/tag.const';
import { DialogEditTagsForTaskComponent } from '../../tag/dialog-edit-tags/dialog-edit-tags-for-task.component';
import { WorkContextService } from '../../work-context/work-context.service';
import { throttle } from 'helpful-decorators';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { Update } from '@ngrx/entity';
import { SnackService } from '../../../core/snack/snack.service';
import { isToday } from '../../../util/is-today.util';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { KeyboardConfig } from '../../config/keyboard-config.model';
import { DialogPlanForDayComponent } from '../../planner/dialog-plan-for-day/dialog-plan-for-day.component';

@Component({
  selector: 'task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation, swirlAnimation],
})
export class TaskComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() isBacklog: boolean = false;
  @Input() isInSubTaskList: boolean = false;

  task!: TaskWithSubTasks;
  T: typeof T = T;
  IS_TOUCH_PRIMARY: boolean = IS_TOUCH_PRIMARY;
  isDragOver: boolean = false;
  isLockPanLeft: boolean = false;
  isLockPanRight: boolean = false;
  isPreventPointerEventsWhilePanning: boolean = false;
  isActionTriggered: boolean = false;
  ShowSubTasksMode: typeof ShowSubTasksMode = ShowSubTasksMode;
  contextMenuPosition: { x: string; y: string } = { x: '0px', y: '0px' };
  progress: number = 0;
  isTodayTag: boolean = false;
  isShowAddToToday: boolean = false;
  isShowRemoveFromToday: boolean = false;

  @ViewChild('taskTitleEditEl', { static: true }) taskTitleEditEl?: ElementRef;
  @ViewChild('blockLeftEl') blockLeftElRef?: ElementRef;
  @ViewChild('blockRightEl') blockRightElRef?: ElementRef;
  @ViewChild('innerWrapperEl', { static: true }) innerWrapperElRef?: ElementRef;
  // only works because item comes first in dom
  @ViewChild('contextMenuTriggerEl', { static: true, read: MatMenuTrigger })
  contextMenu?: MatMenuTrigger;
  @ViewChild('projectMenuTriggerEl', { static: false, read: MatMenuTrigger })
  projectMenuTrigger?: MatMenuTrigger;
  @HostBinding('tabindex') tabIndex: number = 1;
  @HostBinding('class.isDone') isDone: boolean = false;
  @HostBinding('id') taskIdWithPrefix: string = 'NO';
  // @see ngOnInit
  @HostBinding('class.isCurrent') isCurrent: boolean = false;
  @HostBinding('class.isSelected') isSelected: boolean = false;
  private _task$: ReplaySubject<TaskWithSubTasks> = new ReplaySubject(1);
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

  parentTask$: Observable<TaskCopy | null> = this._task$.pipe(
    switchMap((task) =>
      task.parentId ? this._taskService.getByIdLive$(task.parentId) : of(null),
    ),
  );
  parentTitle$: Observable<string | null> = this.parentTask$.pipe(
    map((task) => task && task.title),
  );

  isShowMoveFromAndToBacklogBtns$: Observable<boolean> = this._task$.pipe(
    take(1),
    switchMap((task) =>
      task.projectId ? this._projectService.getByIdOnce$(task.projectId) : EMPTY,
    ),
    map((project) => project.isEnableBacklog),
  );

  isFirstLineHover: boolean = false;
  isRepeatTaskCreatedToday: boolean = false;

  private _dragEnterTarget?: HTMLElement;
  private _destroy$: Subject<boolean> = new Subject<boolean>();
  private _currentPanTimeout?: number;
  private _isTaskDeleteTriggered: boolean = false;

  constructor(
    private readonly _taskService: TaskService,
    private readonly _taskRepeatCfgService: TaskRepeatCfgService,
    private readonly _matDialog: MatDialog,
    private readonly _configService: GlobalConfigService,
    private readonly _issueService: IssueService,
    private readonly _attachmentService: TaskAttachmentService,
    private readonly _elementRef: ElementRef,
    private readonly _snackService: SnackService,
    private readonly _renderer: Renderer2,
    private readonly _cd: ChangeDetectorRef,
    private readonly _projectService: ProjectService,
    public readonly workContextService: WorkContextService,
  ) {}

  @Input('task') set taskSet(v: TaskWithSubTasks) {
    this.task = v;

    this.progress = v && v.timeEstimate && (v.timeSpent / v.timeEstimate) * 100;
    this.taskIdWithPrefix = 't-' + this.task.id;
    this.isDone = v.isDone;
    this.isRepeatTaskCreatedToday = !!(this.task.repeatCfgId && isToday(v.created));

    const isTodayTag = v.tagIds.includes(TODAY_TAG.id);

    this.isShowRemoveFromToday = !!(
      !v.isDone &&
      isTodayTag &&
      (v.projectId || v.tagIds?.length > 1 || v.parentId)
    );

    this.isShowAddToToday =
      !this.isShowRemoveFromToday &&
      !(v.parentId && this.workContextService.isToday) &&
      !isTodayTag;

    this._task$.next(v);
  }

  // methods come last
  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent): void {
    this._handleKeyboardShortcuts(ev);
  }

  // @HostListener('focus', ['$event']) onFocus(ev: Event): void {
  //   if (this._currentFocusId !== this.task.id && ev.target === this._elementRef.nativeElement) {
  //     this._taskService.focusTask(this.task.id);
  //     this._currentFocusId = this.task.id;
  //   }
  // }
  //
  // @HostListener('blur', ['$event']) onBlur(ev: Event): void {
  //   // console.log('BLUR', this._currentFocusId, this.task.id);
  //
  //   //  @TODO replace: hacky way to wait for last update
  //   setTimeout(() => {
  //     if (this._currentFocusId === this.task.id) {
  //       this._taskService.focusTask(null);
  //       this._currentFocusId = null;
  //     }
  //   });
  // }

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
    this._attachmentService.createFromDrop(ev, this.task.id);
    ev.stopPropagation();
    this.isDragOver = false;
  }

  ngOnInit(): void {
    this._taskService.currentTaskId$.pipe(takeUntil(this._destroy$)).subscribe((id) => {
      this.isCurrent = this.task && id === this.task.id;
      this._cd.markForCheck();
    });
    this._taskService.selectedTaskId$.pipe(takeUntil(this._destroy$)).subscribe((id) => {
      this.isSelected = this.task && id === this.task.id;
      this._cd.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    // this._taskService.focusTaskId$
    //   .pipe(
    //     takeUntil(this._destroy$),
    //   )
    //   .subscribe((id) => {
    //     if (id === this.task.id && document.activeElement !== this._elementRef.nativeElement) {
    //       this.focusSelfElement();
    //     }
    //   });

    // hacky but relatively performant
    if (
      this.task.parentId &&
      Date.now() - 200 < this.task.created &&
      !this.task.title.length
    ) {
      setTimeout(() => {
        // when there are multiple instances with the same task we should focus the last one, since it is the one in the
        // task side panel
        const otherTaskEl = document.querySelectorAll('#t-' + this.task.id);
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
    this._destroy$.next(true);
    this._destroy$.unsubscribe();
    window.clearTimeout(this._currentPanTimeout);
  }

  editReminder(): void {
    this._matDialog
      .open(DialogAddTaskReminderComponent, {
        data: { task: this.task } as AddTaskReminderInterface,
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
  }

  planForDay(): void {
    this._matDialog
      .open(DialogPlanForDayComponent, {
        // we focus inside dialog instead
        autoFocus: false,
        data: { task: this.task },
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
  }

  updateIssueData(): void {
    this._issueService.refreshIssueTask(this.task, true, true);
  }

  editTaskRepeatCfg(): void {
    this._matDialog
      .open(DialogEditTaskRepeatCfgComponent, {
        data: {
          task: this.task,
        },
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
  }

  handleUpdateBtnClick(): void {
    this._taskService.setSelectedId(this.task.id);
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
    this._taskService.remove(this.task);
  }

  startTask(): void {
    this._taskService.setCurrentId(this.task.id);
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
      this._taskService.update(this.task.id, { title: newVal });
    }
    this.focusSelf();
  }

  estimateTime(): void {
    this._matDialog
      .open(DialogTimeEstimateComponent, {
        data: { task: this.task },
        autoFocus: !IS_TOUCH_PRIMARY,
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
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
        this.focusSelf();
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
    this.focusNext(true, true);

    if (this.task.isDone) {
      this._taskService.setUnDone(this.task.id);
    } else {
      this._taskService.setDone(this.task.id);
    }
  }

  showAdditionalInfos(): void {
    this._taskService.setSelectedId(this.task.id);
    this.focusSelf();
  }

  hideAdditionalInfos(): void {
    this._taskService.setSelectedId(this.task.id);
    this.focusSelf();
  }

  toggleShowAdditionalInfoOpen(ev?: MouseEvent): void {
    if (this.isSelected) {
      this._taskService.setSelectedId(null);
    } else {
      this._taskService.setSelectedId(this.task.id);
    }
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  toggleShowAttachments(): void {
    this._taskService.setSelectedId(
      this.task.id,
      TaskAdditionalInfoTargetPanel.Attachments,
    );
    this.focusSelf();
  }

  toggleSubTaskMode(): void {
    this._taskService.toggleSubTaskMode(this.task.id, true, true);
    this.focusSelf();
  }

  async editTags(): Promise<void> {
    const taskToEdit = this.task.parentId
      ? await this._taskService.getByIdOnce$(this.task.parentId).toPromise()
      : this.task;
    this._matDialog
      .open(DialogEditTagsForTaskComponent, {
        data: {
          task: taskToEdit,
        },
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
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
          if (this.task.subTaskIds.length) {
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
    // this._taskService.focusTask(this.task.id);
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
    if (!this.taskTitleEditEl || !this.contextMenu) {
      throw new Error('No el');
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    (this.taskTitleEditEl as any).textarea.nativeElement.blur();
    this.contextMenuPosition.x =
      ('touches' in event ? event.touches[0].clientX : event.clientX) + 'px';
    this.contextMenuPosition.y =
      ('touches' in event ? event.touches[0].clientY : event.clientY) + 'px';
    this.contextMenu.openMenu();
  }

  onTagsUpdated(tagIds: string[]): void {
    this._taskService.updateTags(this.task, tagIds, this.task.tagIds);
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
            if (this.task.repeatCfgId) {
              this.editTaskRepeatCfg();
            } else {
              this.planForDay();
            }
          } else {
            if (this.task.parentId) {
              // NOTHING
            } else {
              if (this.task.tagIds.includes(TODAY_TAG.id)) {
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

  moveTaskToProject(projectId: string): void {
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
      this._taskService.moveToProject(this.task, projectId);
    } else {
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
                this._taskService.moveToProject(this.task, projectId);
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
    //  (this.taskTitleEditEl as any).textarea.nativeElement.blur();
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
    if (checkKeyCombo(ev, keys.taskToggleAdditionalInfoOpen)) {
      this.toggleShowAdditionalInfoOpen();
    }
    if (checkKeyCombo(ev, keys.taskOpenEstimationDialog)) {
      this.estimateTime();
    }
    if (checkKeyCombo(ev, keys.taskSchedule)) {
      this.editReminder();
    }
    if (checkKeyCombo(ev, keys.taskPlanForDay)) {
      this.planForDay();
    }
    if (checkKeyCombo(ev, keys.taskToggleDone)) {
      this.toggleDoneKeyboard();
    }
    if (checkKeyCombo(ev, keys.taskAddSubTask)) {
      this.addSubTask();
    }
    if (!this.task.parentId && checkKeyCombo(ev, keys.taskMoveToProject)) {
      if (!this.projectMenuTrigger) {
        throw new Error('No el');
      }
      this.projectMenuTrigger.openMenu();
    }
    if (checkKeyCombo(ev, keys.taskOpenContextMenu)) {
      if (!this.contextMenu) {
        throw new Error('No el');
      }
      this.contextMenu.openMenu();
    }

    if (checkKeyCombo(ev, keys.togglePlay)) {
      if (this.isCurrent) {
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

    if (checkKeyCombo(ev, keys.moveToBacklog) && this.task.projectId) {
      if (!this.task.parentId) {
        ev.preventDefault();
        // same default shortcut as timeline so we stop propagation
        ev.stopPropagation();
        this.focusPrevious(true);
        this.moveToBacklog();
      }
    }

    if (checkKeyCombo(ev, keys.moveToTodaysTasks) && this.task.projectId) {
      if (!this.task.parentId) {
        ev.preventDefault();
        // same default shortcut as timeline so we stop propagation
        ev.stopPropagation();
        this.focusNext(true, true);
        this.moveToToday();
      }
    }

    // collapse sub tasks
    if (ev.key === 'ArrowLeft' || checkKeyCombo(ev, keys.collapseSubTasks)) {
      const hasSubTasks = this.task.subTasks && (this.task.subTasks as any).length > 0;
      if (this.isSelected) {
        this.hideAdditionalInfos();
      } else if (
        hasSubTasks &&
        this.task._showSubTasksMode !== ShowSubTasksMode.HideAll
      ) {
        this._taskService.toggleSubTaskMode(this.task.id, true, false);
        // TODO find a solution
        // } else if (this.task.parentId) {
        // this._taskService.focusTask(this.task.parentId);
      } else {
        this.focusPrevious();
      }
    }

    // expand sub tasks
    if (ev.key === 'ArrowRight' || checkKeyCombo(ev, keys.expandSubTasks)) {
      const hasSubTasks = this.task.subTasks && (this.task.subTasks as any).length > 0;
      if (hasSubTasks && this.task._showSubTasksMode !== ShowSubTasksMode.Show) {
        this._taskService.toggleSubTaskMode(this.task.id, false, false);
      } else if (!this.isSelected) {
        this.showAdditionalInfos();
      } else {
        this.focusNext();
      }
    }

    // moving items
    // move task up
    if (checkKeyCombo(ev, keys.moveTaskUp)) {
      this._taskService.moveUp(this.task.id, this.task.parentId, this.isBacklog);
      ev.stopPropagation();
      ev.preventDefault();
      // timeout required to let changes take place @TODO hacky
      setTimeout(this.focusSelf.bind(this));
      setTimeout(this.focusSelf.bind(this), 10);
      return;
    }

    if (checkKeyCombo(ev, keys.moveTaskDown)) {
      this._taskService.moveDown(this.task.id, this.task.parentId, this.isBacklog);
      // timeout required to let changes take place @TODO hacky
      setTimeout(this.focusSelf.bind(this));
      setTimeout(this.focusSelf.bind(this), 10);
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }

    if (checkKeyCombo(ev, keys.moveTaskToTop)) {
      this._taskService.moveToTop(this.task.id, this.task.parentId, this.isBacklog);
      ev.stopPropagation();
      ev.preventDefault();
      // timeout required to let changes take place @TODO hacky
      setTimeout(this.focusSelf.bind(this));
      setTimeout(this.focusSelf.bind(this), 10);
      return;
    }

    if (checkKeyCombo(ev, keys.moveTaskToBottom)) {
      this._taskService.moveToBottom(this.task.id, this.task.parentId, this.isBacklog);
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
}
