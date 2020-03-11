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
import {TaskService} from '../task.service';
import {Subject} from 'rxjs';
import {ShowSubTasksMode, TaskAdditionalInfoTargetPanel, TaskWithSubTasks} from '../task.model';
import {MatDialog} from '@angular/material/dialog';
import {DialogTimeEstimateComponent} from '../dialog-time-estimate/dialog-time-estimate.component';
import {expandAnimation} from '../../../ui/animations/expand.ani';
import {GlobalConfigService} from '../../config/global-config.service';
import {checkKeyCombo} from '../../../util/check-key-combo';
import {takeUntil} from 'rxjs/operators';
import {fadeAnimation} from '../../../ui/animations/fade.ani';
import {AttachmentService} from '../../attachment/attachment.service';
import {IssueService} from '../../issue/issue.service';
import {DialogEditAttachmentComponent} from '../../attachment/dialog-edit-attachment/dialog-edit-attachment.component';
import {swirlAnimation} from '../../../ui/animations/swirl-in-out.ani';
import {IS_TOUCH, isTouch} from '../../../util/is-touch';
import {DialogAddTaskReminderComponent} from '../dialog-add-task-reminder/dialog-add-task-reminder.component';
import {DialogEditTaskRepeatCfgComponent} from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import {ProjectService} from '../../project/project.service';
import {Project} from '../../project/project.model';
import {unique} from '../../../util/unique';
import {T} from '../../../t.const';
import {MatMenuTrigger} from '@angular/material/menu';
import {AddTaskReminderInterface} from '../dialog-add-task-reminder/add-task-reminder-interface';
import {MY_DAY_TAG} from '../../tag/tag.const';

@Component({
  selector: 'task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation, swirlAnimation]
})
export class TaskComponent implements OnInit, OnDestroy, AfterViewInit {
  task: TaskWithSubTasks;

  @Input('task') set taskSet(v: TaskWithSubTasks) {
    this.task = v;

    this.progress = v && v.timeEstimate && (v.timeSpent / v.timeEstimate) * 100;
    this.taskId = 't-' + this.task.id;
    this.isDone = v.isDone;

    if (v.issueId) {
      this.issueUrl = this._issueService.issueLink(v.issueType, v.issueId);
    }
  }

  @Input() isBacklog: boolean;

  T = T;
  isDragOver: boolean;
  isTouch: boolean = IS_TOUCH;

  isLockPanLeft = false;
  isLockPanRight = false;
  isPreventPointerEventsWhilePanning = false;
  isActionTriggered = false;
  isContextMenuDisabled = false;
  ShowSubTasksMode = ShowSubTasksMode;
  contextMenuPosition = {x: '0px', y: '0px'};

  issueUrl: string;
  progress: number;

  @ViewChild('contentEditableOnClickEl', {static: true}) contentEditableOnClickEl: ElementRef;
  @ViewChild('blockLeft') blockLeftEl: ElementRef;
  @ViewChild('blockRight') blockRightEl: ElementRef;
  @ViewChild(MatMenuTrigger, {static: true}) contextMenu: MatMenuTrigger;

  @HostBinding('tabindex') tabIndex = 1;
  @HostBinding('class.isDone') isDone: boolean;
  @HostBinding('id') taskId: string;
  // @see ngOnInit
  @HostBinding('class.isCurrent') isCurrent: boolean;
  @HostBinding('class.isSelected') isSelected: boolean;

  private _dragEnterTarget: HTMLElement;
  private _destroy$: Subject<boolean> = new Subject<boolean>();
  private _currentPanTimeout: number;

  constructor(
    private readonly _taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _configService: GlobalConfigService,
    private readonly _issueService: IssueService,
    private readonly _attachmentService: AttachmentService,
    private readonly _elementRef: ElementRef,
    private readonly _renderer: Renderer2,
    private readonly _cd: ChangeDetectorRef,
    public readonly projectService: ProjectService,
  ) {
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

  @HostListener('dragenter', ['$event']) onDragEnter(ev: Event) {
    this._dragEnterTarget = ev.target as HTMLElement;
    ev.preventDefault();
    ev.stopPropagation();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(ev: Event) {
    if (this._dragEnterTarget === (ev.target as HTMLElement)) {
      ev.preventDefault();
      ev.stopPropagation();
      this.isDragOver = false;
    }
  }

  @HostListener('drop', ['$event']) onDrop(ev: Event) {
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
      restoreFocus: true,
      data: {
        title: this.task.title,
        taskId: this.task.id,
        reminderId: this.task.reminderId,
        isMoveToBacklogPossible: !this.task.parentId,
      } as AddTaskReminderInterface
    });
  }

  updateIssueData() {
    this._issueService.refreshIssue(this.task, true, true);
  }

  editTaskRepeatCfg() {
    this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
      restoreFocus: false,
      data: {
        task: this.task,
      }
    });
  }

  handleUpdateBtnClick() {
    this._taskService.setSelectedId(this.task.id);
  }

  deleteTask() {
    if (this.task.repeatCfgId) {
      return;
    }

    const tagIds = [...this.task.tagIds];
    this._taskService.remove(this.task);
    this._taskService.purgeUnusedTags(tagIds);
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
    this._matDialog
      .open(DialogTimeEstimateComponent, {
        data: {task: this.task},
        autoFocus: !isTouch(),
      })
      .afterClosed()
      .subscribe(result => {
        this.focusSelf();
      });
  }

  addAttachment() {
    this._matDialog
      .open(DialogEditAttachmentComponent, {
        data: {},
      })
      .afterClosed()
      .subscribe(result => {
        this.focusSelf();
        if (result) {
          this._attachmentService.addAttachment({
            ...result,
            taskId: this.task.id,
          });
        }
      });
  }

  addSubTask() {
    this._taskService.addSubTaskTo(this.task.parentId || this.task.id);
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

  moveToMyDay() {
    this.onTagsUpdated([MY_DAY_TAG.id, ...this.task.tagIds]);
  }

  removeFromMyDay() {
    this.onTagsUpdated(this.task.tagIds.filter(tagId => tagId !== MY_DAY_TAG.id));
  }

  focusPrevious(isFocusReverseIfNotPossible = false) {
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

  focusNext(isFocusReverseIfNotPossible = false) {
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
    this.focusSelfElement();
    // this._taskService.focusTask(this.task.id);
  }

  focusSelfElement() {
    this._elementRef.nativeElement.focus();
  }

  focusTitleForEdit() {
    this.contentEditableOnClickEl.nativeElement.focus();
  }

  openContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.contentEditableOnClickEl.nativeElement.blur();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.openMenu();
  }


  onTagsUpdated(tagIds: string[]) {
    this._taskService.updateTags(this.task.id, tagIds, this.task.tagIds);
  }

  onTagsAdded(tagIds: string[]) {
    tagIds.forEach(tagId => {
      if (this.task.tagIds && this.task.tagIds.indexOf(tagId) !== -1) {
        // TODO: Replace with proper notification or fail silently
        console.warn(`WARNING: Tag '${tagId}' already exists on task!`);
      }
    });
    this.onTagsUpdated(unique([...this.task.tagIds, ...tagIds]));
  }

  onTagsRemoved(tagIds: string[]) {
    this._taskService.removeTags(this.task, tagIds);
    this._taskService.purgeUnusedTags(tagIds);
  }

  onTagReplaced([oldTagId, newTagId]: string[]) {
    const newTags = [...this.task.tagIds, newTagId];
    const removeId = newTags.indexOf(oldTagId);
    if (removeId !== -1) {
      newTags.splice(removeId, 1);
    }
    this.onTagsUpdated(newTags);
  }

  onPanStart(ev) {
    if (!IS_TOUCH) {
      return;
    }

    this._resetAfterPan();
    if (
      (ev.target.className.indexOf && ev.target.className.indexOf('drag-handle') > -1)
      || Math.abs(ev.deltaY) > Math.abs(ev.deltaX)
      || document.activeElement === this.contentEditableOnClickEl.nativeElement
      || ev.isFinal
    ) {
      return;
    }
    if (ev.deltaX > 0) {
      this.isLockPanRight = true;
    } else {
      this.isLockPanLeft = true;
    }
  }

  onPanEnd() {
    if (!IS_TOUCH || !this.isLockPanLeft && !this.isLockPanRight) {
      return;
    }

    this.isPreventPointerEventsWhilePanning = false;
    this._renderer.removeStyle(this.blockLeftEl.nativeElement, 'transition');
    this._renderer.removeStyle(this.blockRightEl.nativeElement, 'transition');

    if (this._currentPanTimeout) {
      window.clearTimeout(this._currentPanTimeout);
    }

    if (this.isActionTriggered) {
      if (this.isLockPanLeft) {
        this._renderer.setStyle(this.blockRightEl.nativeElement, 'transform', `scaleX(1)`);
        this._currentPanTimeout = window.setTimeout(() => {
          if (this.task.isDone) {
            this.toggleTaskDone();
          } else {
            this.editReminder();
          }
          this._resetAfterPan();
        }, 100);
      } else if (this.isLockPanRight) {
        this._renderer.setStyle(this.blockLeftEl.nativeElement, 'transform', `scaleX(1)`);
        this._currentPanTimeout = window.setTimeout(() => {
          this.toggleTaskDone();
          this._resetAfterPan();
        }, 100);
      }
    } else {
      this._resetAfterPan();
    }
  }

  onPanLeft(ev) {
    this._handlePan(ev);
  }

  onPanRight(ev) {
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

  private _handlePan(ev) {
    if (!IS_TOUCH
      || !this.isLockPanLeft && !this.isLockPanRight
      || ev.eventType === 8) {
      return;
    }

    const targetRef = this.isLockPanRight ? this.blockLeftEl : this.blockRightEl;
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
      this._renderer.setStyle(targetRef.nativeElement, 'transform', `scaleX(${scale})`);
      this._renderer.setStyle(targetRef.nativeElement, 'transition', `none`);
    }
  }

  private _resetAfterPan() {
    this.isPreventPointerEventsWhilePanning = false;
    this.isActionTriggered = false;
    this.isLockPanLeft = false;
    this.isLockPanRight = false;
    const scale = 0;
    this._renderer.setStyle(this.blockLeftEl.nativeElement, 'transform', `scaleX(${scale})`);
    this._renderer.setStyle(this.blockRightEl.nativeElement, 'transform', `scaleX(${scale})`);
    this._renderer.removeClass(this.blockLeftEl.nativeElement, 'isActive');
    this._renderer.removeClass(this.blockRightEl.nativeElement, 'isActive');
  }


  private _handleKeyboardShortcuts(ev: KeyboardEvent) {
    if (ev.target !== this._elementRef.nativeElement) {
      return;
    }

    const keys = this._configService.cfg.keyboard;
    const isShiftOrCtrlPressed = (ev.shiftKey === true || ev.ctrlKey === true);

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
      this.toggleTaskDone();
    }
    if (checkKeyCombo(ev, keys.taskAddSubTask)) {
      this.addSubTask();
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
      const hasSubTasks = this.task.subTasks && this.task.subTasks.length > 0;
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
      const hasSubTasks = this.task.subTasks && this.task.subTasks.length > 0;
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
      this._taskService.moveUp(this.task.id);
      ev.stopPropagation();
      ev.preventDefault();
      // timeout required to let changes take place @TODO hacky
      setTimeout(this.focusSelf.bind(this));
    }
    if (checkKeyCombo(ev, keys.moveTaskDown)) {
      this._taskService.moveDown(this.task.id);
      ev.stopPropagation();
      ev.preventDefault();
    }
  }
}
