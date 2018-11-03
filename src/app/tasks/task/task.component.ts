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
import { DragulaService } from 'ng2-dragula';
import { TaskWithSubTasks } from '../task.model';
import shortid from 'shortid';
import { MatDialog } from '@angular/material';
import { DialogTimeEstimateComponent } from '../dialogs/dialog-time-estimate/dialog-time-estimate.component';
import { expandAnimation } from '../../ui/animations/expand.ani';
import { ConfigService } from '../../core/config/config.service';
import { checkKeyCombo } from '../../core/util/check-key-combo';
import { takeUntil } from 'rxjs/operators';

// import {Task} from './task'

@Component({
  selector: 'task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class TaskComponent implements OnInit, OnDestroy, AfterViewInit {
  // @Input() task: Task;
  @Input() task: TaskWithSubTasks;
  @Input() focusIdList: string[];

  additionalTabsIndex = 0;

  subTaskListId: string;
  private _currentFocusId: string;

  @HostBinding('class.is-current') isCurrent = false;

  @ViewChild('editOnClickEl') editOnClickEl: ElementRef;

  @HostBinding('tabindex') tabIndex = 1;
  private _destroy$: Subject<boolean> = new Subject<boolean>();

  @HostBinding('class.is-done')
  private get _isDone() {
    return this.task.isDone;
  }

  // methods come last
  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent) {
    this._handleKeyboardShortcuts(ev);
  }

  @HostListener('focus', ['$event']) onFocus(ev: Event) {
    if (ev.target === this._elementRef.nativeElement && this._currentFocusId !== this.task.id) {
      this._taskService.focusTask(this.task.id);
    }
  }

  constructor(
    private readonly _taskService: TaskService,
    private readonly _dragulaService: DragulaService,
    private readonly _matDialog: MatDialog,
    private readonly _configService: ConfigService,
    private readonly _elementRef: ElementRef,
  ) {
  }

  public get progress() {
    return this.task && this.task.timeEstimate && (this.task.timeSpent / this.task.timeEstimate) * 100;
  }

  ngOnInit() {
    this.subTaskListId = shortid();
    this._dragulaService.createGroup(this.subTaskListId, {
      moves: function (el, container, handle) {
        return handle.className.indexOf('handle-sub') > -1;
      }
    });
  }

  ngAfterViewInit() {
    this._taskService.currentTaskId$
      .pipe(takeUntil(this._destroy$))
      .subscribe((id) => {
        this.isCurrent = (this.task && id === this.task.id);
      });

    this._taskService.focusTaskId$
      .pipe(takeUntil(this._destroy$))
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
    this._taskService.addSubTaskTo(this.task.id);
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
  }

  toggleHideSubTasks() {
    this.task.isHideSubTasks
      ? this._taskService.showSubTasks(this.task.id)
      : this._taskService.hideSubTasks(this.task.id);
  }

  focusPrevious() {
    this._taskService.focusPreviousInList(this.task.id, this.focusIdList);
  }

  focusNext() {
    this._taskService.focusNextInList(this.task.id, this.focusIdList);
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
    const keys = this._configService.cfg.keyboard;
    const isShiftOrCtrlPressed = (ev.shiftKey === true || ev.ctrlKey === true);
    // do not bubble up to parent
    ev.stopPropagation();

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
      this.focusSelf();
    }

    if (checkKeyCombo(ev, keys.moveToBacklog)) {
      if (!this.task.parentId) {
        this._taskService.moveToBacklog(this.task.id);
        this.focusSelf();
      }
    }

    if (checkKeyCombo(ev, keys.moveToTodaysTasks)) {
      if (!this.task.parentId) {
        this._taskService.moveToToday(this.task.id);
        this.focusSelf();
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
    }
    if (checkKeyCombo(ev, keys.moveTaskDown)) {
      this._taskService.moveDown(this.task.id);
      ev.stopPropagation();
      ev.preventDefault();
    }
  }
}
