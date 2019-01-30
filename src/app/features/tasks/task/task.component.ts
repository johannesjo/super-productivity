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
  ViewChild
} from '@angular/core';
import { TaskService } from '../task.service';
import { Subject } from 'rxjs';
import { HIDE_SUB_TASKS, SHOW_SUB_TASKS, TaskWithSubTasks } from '../task.model';
import { MatDialog } from '@angular/material';
import { DialogTimeEstimateComponent } from '../dialogs/dialog-time-estimate/dialog-time-estimate.component';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { ConfigService } from '../../config/config.service';
import { checkKeyCombo } from '../../../util/check-key-combo';
import { takeUntil } from 'rxjs/operators';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { AttachmentService } from '../../attachment/attachment.service';
import { IssueService } from '../../issue/issue.service';
import { DialogEditAttachmentComponent } from '../../attachment/dialog-edit-attachment/dialog-edit-attachment.component';
import { swirlAnimation } from '../../../ui/animations/swirl-in-out.ani';
import { isTouch } from '../../../util/is-touch';

@Component({
  selector: 'task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation, swirlAnimation]
})
export class TaskComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() task: TaskWithSubTasks;

  // TODO also persist to task
  additionalTabsIndex = 0;
  isDragOver: boolean;
  isCurrent: boolean;

  @ViewChild('editOnClickEl') editOnClickEl: ElementRef;
  @HostBinding('tabindex') tabIndex = 1;
  private _dragEnterTarget: HTMLElement;
  private _destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    private readonly _taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _configService: ConfigService,
    private readonly _issueService: IssueService,
    private readonly _attachmentService: AttachmentService,
    private readonly _elementRef: ElementRef,
    private readonly _cd: ChangeDetectorRef,
  ) {
  }

  public get progress() {
    return this.task && this.task.timeEstimate && (this.task.timeSpent / this.task.timeEstimate) * 100;
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
    if (this._dragEnterTarget === (event.target as HTMLElement)) {
      event.preventDefault();
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
        this._cd.detectChanges();
      });
  }

  ngAfterViewInit() {
    // this._taskService.focusTaskId$
    //   .pipe(
    //     takeUntil(this._destroy$),
    //     distinctUntilChanged()
    //   )
    //   .subscribe((id) => {
    //     this._currentFocusId = id;
    //     if (id === this.task.id && document.activeElement !== this._elementRef.nativeElement) {
    //       this.focusSelfElement();
    //     }
    //     this._cd.markForCheck();
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
  }

  updateIssueData() {
    this._issueService.refreshIssue(this.task.issueType, this.task.issueId, this.task.issueData);
  }

  handleUpdateBtnClick() {
    this.additionalTabsIndex = 0;
    this._taskService.showAdditionalInfoOpen(this.task.id);
  }

  deleteTask() {
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
      this.focusSelf();
    } else {
      this.focusNext(true);
    }
    this.task.isDone
      ? this._taskService.setUnDone(this.task.id)
      : this._taskService.setDone(this.task.id);
  }


  showAdditionalInfos() {
    if (!this.task._isAdditionalInfoOpen) {
      this._taskService.showAdditionalInfoOpen(this.task.id);
      this.focusSelf();
    }
  }

  hideAdditionalInfos() {
    if (this.task._isAdditionalInfoOpen) {
      this._taskService.hideAdditionalInfoOpen(this.task.id);
      this.focusSelf();
    }
  }


  toggleShowAdditionalInfoOpen() {
    this.task._isAdditionalInfoOpen
      ? this._taskService.hideAdditionalInfoOpen(this.task.id)
      : this._taskService.showAdditionalInfoOpen(this.task.id);
    this.focusSelf();
  }

  toggleShowAttachments() {
    const attachmentTabIndex = this.task.issueData ? 2 : 1;
    (this.task._isAdditionalInfoOpen && this.task._currentTab === attachmentTabIndex)
      ? this._taskService.hideAdditionalInfoOpen(this.task.id)
      : this._taskService.updateUi(this.task.id, {
        _isAdditionalInfoOpen: true,
        _currentTab: attachmentTabIndex,
      });
    this.focusSelf();
  }

  toggleSubTaskMode() {
    this._taskService.toggleSubTaskMode(this.task.id, true, true);
    this.focusSelf();
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
    this.editOnClickEl.nativeElement.focus();
  }


  onTaskNotesChanged(newVal) {
    this._taskService.update(this.task.id, {notes: newVal});
    this.focusSelf();
  }

  onTabIndexChange(newVal) {
    this._taskService.updateUi(this.task.id, {_currentTab: newVal || 0});
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
      if (this.task._isAdditionalInfoOpen) {
        this.hideAdditionalInfos();
      } else if (hasSubTasks && this.task._showSubTasksMode !== HIDE_SUB_TASKS) {
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
      if (hasSubTasks && this.task._showSubTasksMode !== SHOW_SUB_TASKS) {
        this._taskService.toggleSubTaskMode(this.task.id, false, false);
      } else if (!this.task._isAdditionalInfoOpen) {
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
