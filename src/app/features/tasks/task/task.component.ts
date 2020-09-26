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
  ViewChild
} from '@angular/core';
import { TaskService } from '../task.service';
import { Observable, of, ReplaySubject, Subject } from 'rxjs';
import { ShowSubTasksMode, TaskAdditionalInfoTargetPanel, TaskWithSubTasks } from '../task.model';
import { MatDialog } from '@angular/material/dialog';
import { DialogTimeEstimateComponent } from '../dialog-time-estimate/dialog-time-estimate.component';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { GlobalConfigService } from '../../config/global-config.service';
import { checkKeyCombo } from '../../../util/check-key-combo';
import { distinctUntilChanged, map, switchMap, take, takeUntil } from 'rxjs/operators';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { TaskAttachmentService } from '../task-attachment/task-attachment.service';
import { IssueService } from '../../issue/issue.service';
import { DialogEditTaskAttachmentComponent } from '../task-attachment/dialog-edit-attachment/dialog-edit-task-attachment.component';
import { swirlAnimation } from '../../../ui/animations/swirl-in-out.ani';
import { IS_TOUCH_ONLY, isTouchOnly } from '../../../util/is-touch';
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
import { environment } from '../../../../environments/environment';
import { throttle } from 'helpful-decorators';

@Component({
  selector: 'task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation, swirlAnimation]
})
export class TaskComponent implements OnInit, OnDestroy, AfterViewInit {
  task!: TaskWithSubTasks;
  @Input() isBacklog: boolean = false;
  T: typeof T = T;
  isTouchOnly: boolean = IS_TOUCH_ONLY;
  isDragOver: boolean = false;
  isLockPanLeft: boolean = false;
  isLockPanRight: boolean = false;
  isPreventPointerEventsWhilePanning: boolean = false;
  isActionTriggered: boolean = false;
  ShowSubTasksMode: typeof ShowSubTasksMode = ShowSubTasksMode;
  contextMenuPosition: { x: string; y: string } = {x: '0px', y: '0px'};
  progress: number = 0;
  isDev: boolean = !(environment.production || environment.stage);
  @ViewChild('contentEditableOnClickEl', {static: true}) contentEditableOnClickEl?: ElementRef;
  @ViewChild('blockLeftEl') blockLeftElRef?: ElementRef;
  @ViewChild('blockRightEl') blockRightElRef?: ElementRef;
  @ViewChild('innerWrapperEl', {static: true}) innerWrapperElRef?: ElementRef;
  // only works because item comes first in dom
  @ViewChild('contextMenuTriggerEl', {static: true, read: MatMenuTrigger}) contextMenu?: MatMenuTrigger;
  @ViewChild('projectMenuTriggerEl', {static: false, read: MatMenuTrigger}) projectMenuTrigger?: MatMenuTrigger;
  @HostBinding('tabindex') tabIndex: number = 1;
  @HostBinding('class.isDone') isDone: boolean = false;
  @HostBinding('id') taskIdWithPrefix: string = 'NO';
  // @see ngOnInit
  @HostBinding('class.isCurrent') isCurrent: boolean = false;
  @HostBinding('class.isSelected') isSelected: boolean = false;
  TODAY_TAG_ID: string = TODAY_TAG.id;
  private _task$: ReplaySubject<TaskWithSubTasks> = new ReplaySubject(1);
  issueUrl$: Observable<string | null> = this._task$.pipe(
    switchMap((v) => {
      return (v.issueType && v.issueId && v.projectId)
        ? this._issueService.issueLink$(v.issueType, v.issueId, v.projectId)
        : of(null);
    }),
    take(1),
  );
  moveToProjectList$: Observable<Project[]> = this._task$.pipe(
    map(t => t.projectId),
    distinctUntilChanged(),
    switchMap((pid) => this._projectService.getProjectsWithoutId$(pid)),
  );
  private _dragEnterTarget?: HTMLElement;
  private _destroy$: Subject<boolean> = new Subject<boolean>();
  private _currentPanTimeout?: number;
  private _isTaskDeleteTriggered: boolean = false;

  constructor(
    private readonly _taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _configService: GlobalConfigService,
    private readonly _issueService: IssueService,
    private readonly _attachmentService: TaskAttachmentService,
    private readonly _elementRef: ElementRef,
    private readonly _renderer: Renderer2,
    private readonly _cd: ChangeDetectorRef,
    private readonly _projectService: ProjectService,
    public readonly workContextService: WorkContextService,
  ) {
  }

  @Input('task') set taskSet(v: TaskWithSubTasks) {
    this.task = v;

    this.progress = v && v.timeEstimate && (v.timeSpent / v.timeEstimate) * 100;
    this.taskIdWithPrefix = 't-' + this.task.id;
    this.isDone = v.isDone;
    this._task$.next(v);
  }

  // methods come last
  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent) {
    this._handleKeyboardShortcuts(ev);
  }

  // @HostListener('focus', ['$event']) onFocus(ev: Event) {
  //   if (this._currentFocusId !== this.task.id && ev.target === this._elementRef.nativeElement) {
  //     this._taskService.focusTask(this.task.id);
  //     this._currentFocusId = this.task.id;
  //   }
  // }
  //
  // @HostListener('blur', ['$event']) onBlur(ev: Event) {
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

  @HostListener('dragenter', ['$event']) onDragEnter(ev: DragEvent) {
    this._dragEnterTarget = ev.target as HTMLElement;
    ev.preventDefault();
    ev.stopPropagation();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(ev: DragEvent) {
    if (this._dragEnterTarget === (ev.target as HTMLElement)) {
      ev.preventDefault();
      ev.stopPropagation();
      this.isDragOver = false;
    }
  }

  @HostListener('drop', ['$event']) onDrop(ev: DragEvent) {
    this._attachmentService.createFromDrop(ev, this.task.id);
    ev.stopPropagation();
    this.isDragOver = false;
  }

  ngOnInit() {
    this._taskService.currentTaskId$
      .pipe(takeUntil(this._destroy$))
      .subscribe((id) => {
        this.isCurrent = (this.task && id === this.task.id);
        this._cd.markForCheck();
      });
    this._taskService.selectedTaskId$
      .pipe(takeUntil(this._destroy$))
      .subscribe((id) => {
        this.isSelected = (this.task && id === this.task.id);
        this._cd.markForCheck();
      });
  }

  ngAfterViewInit() {
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
    if (this.task.parentId && Date.now() - 100 < this.task.created) {
      setTimeout(() => {
        this.focusTitleForEdit();
      });
    }
  }

  ngOnDestroy() {
    this._destroy$.next(true);
    this._destroy$.unsubscribe();

    if (this._currentPanTimeout) {
      window.clearTimeout(this._currentPanTimeout);
    }
  }

  editReminder() {
    if (this.task.repeatCfgId) {
      return;
    }

    this._matDialog.open(DialogAddTaskReminderComponent, {
      data: {task: this.task} as AddTaskReminderInterface
    })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
  }

  updateIssueData() {
    this._issueService.refreshIssue(this.task, true, true);
  }

  editTaskRepeatCfg() {
    this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
      data: {
        task: this.task,
      }
    })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
  }

  handleUpdateBtnClick() {
    this._taskService.setSelectedId(this.task.id);
  }

  deleteTask() {
    if (this._isTaskDeleteTriggered) {
      return;
    }

    this._isTaskDeleteTriggered = true;
    this._taskService.remove(this.task);
    this.focusNext(true);
  }

  startTask() {
    this._taskService.setCurrentId(this.task.id);
    this.focusSelf();
  }

  pauseTask() {
    this._taskService.pauseCurrent();
  }

  updateTaskTitleIfChanged(isChanged: boolean, newTitle: string) {
    if (isChanged) {
      this._taskService.update(this.task.id, {title: newTitle});
    }
    this.focusSelf();
  }

  estimateTime() {
    this._matDialog.open(DialogTimeEstimateComponent, {
      data: {task: this.task},
      autoFocus: !isTouchOnly(),
    })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
  }

  addAttachment() {
    this._matDialog.open(DialogEditTaskAttachmentComponent, {
      data: {},
    })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(result => {
        this.focusSelf();
        if (result) {
          this._attachmentService.addAttachment(this.task.id, result);
        }
      });
  }

  addSubTask() {
    this._taskService.addSubTaskTo(this.task.parentId || this.task.id);
  }

  @throttle(200, {leading: true, trailing: false})
  toggleDoneKeyboard() {
    this.toggleTaskDone();
    if (!this.task.parentId) {
      this.focusNext(true);
    }
  }

  toggleTaskDone() {
    if (this.task.parentId) {
      this.focusNext(true);
    }
    this.task.isDone
      ? this._taskService.setUnDone(this.task.id)
      : this._taskService.setDone(this.task.id);
  }

  showAdditionalInfos() {
    this._taskService.setSelectedId(this.task.id);
    this.focusSelf();
  }

  hideAdditionalInfos() {
    this._taskService.setSelectedId(this.task.id);
    this.focusSelf();
  }

  toggleShowAdditionalInfoOpen() {
    this.isSelected
      ? this._taskService.setSelectedId(null)
      : this._taskService.setSelectedId(this.task.id);
    // this.focusSelf();
  }

  toggleShowAttachments() {
    this._taskService.setSelectedId(this.task.id, TaskAdditionalInfoTargetPanel.Attachments);
    this.focusSelf();
  }

  toggleSubTaskMode() {
    this._taskService.toggleSubTaskMode(this.task.id, true, true);
    this.focusSelf();
  }

  editTags() {
    this._matDialog.open(DialogEditTagsForTaskComponent, {
      data: {
        task: this.task
      }
    })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
  }

  addToMyDay() {
    this.onTagsUpdated([TODAY_TAG.id, ...this.task.tagIds]);
  }

  removeFromMyDay() {
    this.onTagsUpdated(this.task.tagIds.filter(tagId => tagId !== TODAY_TAG.id));
  }

  focusPrevious(isFocusReverseIfNotPossible: boolean = false) {
    if (IS_TOUCH_ONLY) {
      return;
    }

    const taskEls = Array.from(document.querySelectorAll('task'));
    const currentIndex = taskEls.findIndex(el => document.activeElement === el);
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

  focusNext(isFocusReverseIfNotPossible: boolean = false) {
    if (IS_TOUCH_ONLY) {
      return;
    }

    const taskEls = Array.from(document.querySelectorAll('task'));
    const currentIndex = taskEls.findIndex(el => document.activeElement === el);
    const nextEl = taskEls[currentIndex + 1] as HTMLElement;

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

  focusSelf() {
    if (IS_TOUCH_ONLY) {
      return;
    }

    this.focusSelfElement();
    // this._taskService.focusTask(this.task.id);
  }

  focusSelfElement() {
    this._elementRef.nativeElement.focus();
  }

  focusTitleForEdit() {
    if (!this.contentEditableOnClickEl) {
      throw new Error('No el');
    }
    this.contentEditableOnClickEl.nativeElement.focus();
  }

  openContextMenu(event: MouseEvent) {
    if (!this.contentEditableOnClickEl || !this.contextMenu) {
      throw new Error('No el');
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.contentEditableOnClickEl.nativeElement.blur();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.openMenu();
  }

  onTagsUpdated(tagIds: string[]) {
    this._taskService.updateTags(this.task, tagIds, this.task.tagIds);
  }

  onPanStart(ev: any) {
    if (!IS_TOUCH_ONLY) {
      return;
    }
    if (!this.contentEditableOnClickEl) {
      throw new Error('No el');
    }

    this._resetAfterPan();
    const targetEl: HTMLElement = ev.target as HTMLElement;
    if (
      (targetEl.className.indexOf && targetEl.className.indexOf('drag-handle') > -1)
      || Math.abs(ev.deltaY) > Math.abs(ev.deltaX)
      || document.activeElement === this.contentEditableOnClickEl.nativeElement
      || ev.isFinal
    ) {
      return;
    }
    if (ev.deltaX > 0) {
      this.isLockPanRight = true;
    } else if (ev.deltaX < 0) {
      this.isLockPanLeft = true;
    }
  }

  onPanEnd() {
    if (!IS_TOUCH_ONLY || !this.isLockPanLeft && !this.isLockPanRight) {
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
        this._renderer.setStyle(this.blockRightElRef.nativeElement, 'transform', `scaleX(1)`);
        this._currentPanTimeout = window.setTimeout(() => {

          if (this.workContextService.isToday) {
            if (this.task.repeatCfgId) {
              this.editTaskRepeatCfg();
            } else {
              this.editReminder();
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
        this._renderer.setStyle(this.blockLeftElRef.nativeElement, 'transform', `scaleX(1)`);
        this._currentPanTimeout = window.setTimeout(() => {
          this.toggleTaskDone();
          this._resetAfterPan();
        }, 100);
      }
    } else {
      this._resetAfterPan();
    }
  }

  onPanLeft(ev: any) {
    this._handlePan(ev);
  }

  onPanRight(ev: any) {
    this._handlePan(ev);
  }

  moveTaskToProject(projectId: string) {
    this._taskService.moveToProject(this.task, projectId);
  }

  moveToBacklog() {
    this._taskService.moveToBacklog(this.task.id);
  }

  moveToToday() {
    this._taskService.moveToToday(this.task.id);
  }

  trackByProjectId(i: number, project: Project) {
    return project.id;
  }

  private _handlePan(ev: any) {
    if (!IS_TOUCH_ONLY
      || !this.isLockPanLeft && !this.isLockPanRight
      || ev.eventType === 8) {
      return;
    }
    if (!this.innerWrapperElRef) {
      throw new Error('No el');
    }

    const targetRef = this.isLockPanRight
      ? this.blockLeftElRef
      : this.blockRightElRef;

    const MAGIC_FACTOR = 2;
    this.isPreventPointerEventsWhilePanning = true;
    // this.contentEditableOnClickEl.nativeElement.blur();
    if (targetRef) {
      let scale = ev.deltaX / this._elementRef.nativeElement.offsetWidth * MAGIC_FACTOR;
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
      this._renderer.setStyle(this.innerWrapperElRef.nativeElement, 'transform', `translateX(${ev.deltaX}px`);
    }
  }

  private _resetAfterPan() {
    if (!this.contentEditableOnClickEl || !this.blockLeftElRef || !this.blockRightElRef || !this.innerWrapperElRef) {
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

  private _handleKeyboardShortcuts(ev: KeyboardEvent) {
    if (ev.target !== this._elementRef.nativeElement) {
      return;
    }

    const cfg = this._configService.cfg;
    if (!cfg) {
      throw new Error();
    }
    const keys = cfg.keyboard;
    const isShiftOrCtrlPressed = (ev.shiftKey || ev.ctrlKey);

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
    if (checkKeyCombo(ev, keys.taskToggleDone)) {
      this.toggleDoneKeyboard();
    }
    if (checkKeyCombo(ev, keys.taskAddSubTask)) {
      this.addSubTask();
    }
    if (checkKeyCombo(ev, keys.taskMoveToProject)) {
      if (!this.projectMenuTrigger) {
        throw new Error('No el');
      }
      this.projectMenuTrigger.openMenu();
    }

    if (checkKeyCombo(ev, keys.togglePlay)) {
      if (this.isCurrent) {
        this.pauseTask();
      } else {
        this.startTask();
      }
    }

    if (checkKeyCombo(ev, keys.taskDelete)) {
      this.deleteTask();
    }

    if (checkKeyCombo(ev, keys.moveToBacklog)) {
      if (!this.task.parentId) {
        this.focusPrevious(true);
        this._taskService.moveToBacklog(this.task.id);
      }
    }

    if (checkKeyCombo(ev, keys.moveToTodaysTasks)) {
      if (!this.task.parentId) {
        this.focusNext(true);
        this._taskService.moveToToday(this.task.id);
      }
    }

    // move focus up
    if ((!isShiftOrCtrlPressed && ev.key === 'ArrowUp') || checkKeyCombo(ev, keys.selectPreviousTask)) {
      ev.preventDefault();
      this.focusPrevious();
    }
    // move focus down
    if ((!isShiftOrCtrlPressed && ev.key === 'ArrowDown') || checkKeyCombo(ev, keys.selectNextTask)) {
      ev.preventDefault();
      this.focusNext();
    }

    // collapse sub tasks
    if ((ev.key === 'ArrowLeft') || checkKeyCombo(ev, keys.collapseSubTasks)) {
      const hasSubTasks = this.task.subTasks
        && (this.task.subTasks as any).length > 0;
      if (this.isSelected) {
        this.hideAdditionalInfos();
      } else if (hasSubTasks && this.task._showSubTasksMode !== ShowSubTasksMode.HideAll) {
        this._taskService.toggleSubTaskMode(this.task.id, true, false);
        // TODO find a solution
        // } else if (this.task.parentId) {
        // this._taskService.focusTask(this.task.parentId);
      } else {
        this.focusPrevious();
      }
    }

    // expand sub tasks
    if ((ev.key === 'ArrowRight') || checkKeyCombo(ev, keys.expandSubTasks)) {
      const hasSubTasks = this.task.subTasks
        && (this.task.subTasks as any).length > 0;
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
    }
    if (checkKeyCombo(ev, keys.moveTaskDown)) {
      this._taskService.moveDown(this.task.id, this.task.parentId, this.isBacklog);
      ev.stopPropagation();
      ev.preventDefault();
    }
  }
}
