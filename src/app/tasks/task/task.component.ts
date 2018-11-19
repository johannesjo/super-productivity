import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
import { TaskWithSubTasks } from '../task.model';
import { MatDialog } from '@angular/material';
import { DialogTimeEstimateComponent } from '../dialogs/dialog-time-estimate/dialog-time-estimate.component';
import { expandAnimation } from '../../ui/animations/expand.ani';
import { ConfigService } from '../../core/config/config.service';
import { checkKeyCombo } from '../../core/util/check-key-combo';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { AttachmentService } from '../attachment/attachment.service';

// import {Task} from './task'

@Component({
  selector: 'task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation]
})
export class TaskComponent implements OnInit, OnDestroy, AfterViewInit {
  // @Input() task: Task;
  @Input() task: TaskWithSubTasks;
  @Input() focusIdList: string[];

  // TODO also persist to task
  additionalTabsIndex = 0;
  isDragOver: boolean;

  private _dragEnterTarget: HTMLElement;
  private _currentFocusId: string;

  @HostBinding('class.isCurrent') isCurrent = false;

  @ViewChild('editOnClickEl') editOnClickEl: ElementRef;

  @HostBinding('tabindex') tabIndex = 1;
  private _destroy$: Subject<boolean> = new Subject<boolean>();

  @HostBinding('class.is-done')
  private get _isDone() {
    return this.task.isDone;
  }

  @HostBinding('class.is-focused')
  private get _isFocused() {
    return this.task.id === this._currentFocusId;
  }

  // methods come last
  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent) {
    this._handleKeyboardShortcuts(ev);
  }

  @HostListener('focus', ['$event']) onFocus(ev: Event) {
    if (this._currentFocusId !== this.task.id && ev.target === this._elementRef.nativeElement) {
      this._taskService.focusTask(this.task.id);
      this._currentFocusId = this.task.id;
    }
  }

  @HostListener('blur', ['$event']) onBlur(ev: Event) {
    console.log('BLUR', this._currentFocusId, this.task.id);

    //  @TODO replace: hacky way to wait for last update
    setTimeout(() => {
      if (this._currentFocusId === this.task.id) {
        this._taskService.focusTask(null);
        this._currentFocusId = null;
      }
    });
  }

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

  constructor(
    private readonly _taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _configService: ConfigService,
    private readonly _attachmentService: AttachmentService,
    private readonly _elementRef: ElementRef,
  ) {
  }

  public get progress() {
    return this.task && this.task.timeEstimate && (this.task.timeSpent / this.task.timeEstimate) * 100;
  }

  ngOnInit() {
    this._taskService.currentTaskId$
      .pipe(takeUntil(this._destroy$))
      .subscribe((id) => {
        this.isCurrent = (this.task && id === this.task.id);
      });

  }

  ngAfterViewInit() {
    this._taskService.focusTaskId$
      .pipe(
        takeUntil(this._destroy$),
        distinctUntilChanged()
      )
      .subscribe((id) => {
        this._currentFocusId = id;
        if (id === this.task.id && document.activeElement !== this._elementRef.nativeElement) {
          this.focusSelfElement();
        }
      });
  }

  ngOnDestroy() {
    this._destroy$.next(true);
    this._destroy$.unsubscribe();
  }

  handleUpdateBtnClick() {
    this.additionalTabsIndex = 0;
    this._taskService.showNotes(this.task.id);
  }

  deleteTask() {
    this._taskService.remove(this.task.id);
    this.focusNext();
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
      })
      .afterClosed()
      .subscribe(result => {
        this.focusSelf();
      });
  }

  addSubTask() {
    this._taskService.addSubTaskTo(this.task.parentId || this.task.id);
  }

  toggleTaskDone() {
    this.task.isDone
      ? this._taskService.setUnDone(this.task.id)
      : this._taskService.setDone(this.task.id);
  }

  toggleShowNotes() {
    this.task.isNotesOpen
      ? this._taskService.hideNotes(this.task.id)
      : this._taskService.showNotes(this.task.id);
    this.focusSelf();
  }

  toggleHideSubTasks() {
    this.task.isHideSubTasks
      ? this._taskService.showSubTasks(this.task.id)
      : this._taskService.hideSubTasks(this.task.id);
    this.focusSelf();
  }

  focusPrevious(isSelectReverseIfNotPossible = false) {
    this._taskService.focusPreviousInList(this.task.id, this.focusIdList, isSelectReverseIfNotPossible);
  }

  focusNext(isSelectReverseIfNotPossible = false) {
    this._taskService.focusNextInList(this.task.id, this.focusIdList, isSelectReverseIfNotPossible);
  }

  focusSelf() {
    this.focusSelfElement();
    this._taskService.focusTask(this.task.id);
  }

  focusSelfElement() {
    this._elementRef.nativeElement.focus();
  }


  onTaskNotesChanged($event) {
    this._taskService.update(this.task.id, {notes: $event.newVal});
    this.focusSelf();
  }

  private _handleKeyboardShortcuts(ev: KeyboardEvent) {
    if (ev.target !== this._elementRef.nativeElement) {
      return;
    }

    const keys = this._configService.cfg.keyboard;
    const isShiftOrCtrlPressed = (ev.shiftKey === true || ev.ctrlKey === true);

    if (checkKeyCombo(ev, keys.taskEditTitle) || ev.key === 'Enter') {
      this.editOnClickEl.nativeElement.focus();
      // prevent blur
      ev.preventDefault();
    }
    if (checkKeyCombo(ev, keys.taskToggleNotes)) {
      this.toggleShowNotes();
      this.focusSelf();
    }
    if (checkKeyCombo(ev, keys.taskOpenEstimationDialog)) {
      this.estimateTime();
    }
    if (checkKeyCombo(ev, keys.taskToggleDone)) {
      this.toggleTaskDone();
      this.focusSelf();
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
      this.focusPrevious(true);
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

    // expand sub tasks
    if ((ev.key === 'ArrowRight') || checkKeyCombo(ev, keys.expandSubTasks)) {
      if (this.task.subTasks && this.task.subTasks.length > 0) {
        this._taskService.showSubTasks(this.task.id);
      }
      // if already opened or is sub task select next task
      if ((this.task.subTasks && this.task.subTasks.length > 0 && this.task.isHideSubTasks === false)) {
        this.focusNext();
      }
    }

    // collapse sub tasks
    if ((ev.key === 'ArrowLeft') || checkKeyCombo(ev, keys.collapseSubTasks)) {

      if (this.task.subTasks && this.task.subTasks.length > 0) {
        this._taskService.hideSubTasks(this.task.id);
      }
      // if already collapsed
      if (this.task.isHideSubTasks === true) {
        if (this.task.isNotesOpen) {
          this.toggleShowNotes();
        } else {
          this.focusPrevious();
        }
      }
      if (this.task.parentId) {
        this._taskService.focusTask(this.task.parentId);
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
