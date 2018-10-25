import { ChangeDetectionStrategy, Component, HostBinding, HostListener, Input, OnInit } from '@angular/core';
import { TaskService } from '../task.service';
import { Observable } from 'rxjs';
import { DragulaService } from 'ng2-dragula';
import { TaskWithSubTasks } from '../task.model';
import shortid from 'shortid';
import { MatDialog } from '@angular/material';
import { DialogTimeEstimateComponent } from '../dialogs/dialog-time-estimate/dialog-time-estimate.component';
import { expandAnimation } from '../../ui/animations/expand.ani';
import { ConfigService } from '../../core/config/config.service';

// import {Task} from './task'

@Component({
  selector: 'task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class TaskComponent implements OnInit {
  // @Input() task: Task;
  @Input() task: TaskWithSubTasks;
  @HostBinding('tabindex') tabIndex = 1;

  @HostBinding('class.is-done')
  private get _isDone() {
    return this.task.isDone;
  }

  @HostBinding('class.is-current') isCurrent = false;
  currentTaskId$: Observable<string>;
  subTaskListId: string;

  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent) {
    this._handleKeyboardShortcuts(ev);
  }

  constructor(
    private readonly _taskService: TaskService,
    private readonly _dragulaService: DragulaService,
    private readonly _matDialog: MatDialog,
    private readonly _configService: ConfigService,
  ) {
  }

  public get progress() {
    return this.task && this.task.timeEstimate && (this.task.timeSpent / this.task.timeEstimate) * 100;
  }

  ngOnInit() {
    this.currentTaskId$ = this._taskService.currentTaskId$;
    this.currentTaskId$.subscribe((val) => {
      this.isCurrent = (this.task && val === this.task.id);
    });

    this.subTaskListId = shortid();
    this._dragulaService.createGroup(this.subTaskListId, {
      moves: function (el, container, handle) {
        return handle.className.indexOf('handle-sub') > -1;
      }
    });
  }

  deleteTask() {
    this._taskService.remove(this.task.id);
  }


  startTask() {
    this._taskService.setCurrentId(this.task.id);
  }

  pauseTask() {
    this._taskService.pauseCurrent();
  }

  updateTaskTitleIfChanged(isChanged: boolean, newTitle: string) {
    if (isChanged) {
      this._taskService.update(this.task.id, {title: newTitle});
    }
  }

  estimateTime() {
    this._matDialog
      .open(DialogTimeEstimateComponent, {
        data: {task: this.task},
      })
      .afterClosed()
      .subscribe(result => {
        console.log(result);
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

  focusTask() {
  }


  onTaskNotesChanged($event) {
    this._taskService.update(this.task.id, {notes: $event.newVal});
  }

  private _handleKeyboardShortcuts(ev: KeyboardEvent) {
    // const keyboardCfg = this._configService.cfg.keyboard;
    //
    // if (checkKeyCombo(ev, keyboardCfg.taskEditTitle) || ev.key === 'Enter') {
    //   // this.$scope.$broadcast(this.EDIT_ON_CLICK_TOGGLE_EV, task.id);
    // }
    // if (checkKeyCombo(ev, keyboardCfg.taskToggleNotes)) {
    //  this.toggleShowNotes()
    // }
    // if (checkKeyCombo(ev, keyboardCfg.taskOpenEstimationDialog)) {
    //   this.estimateTime(task);
    // }
    // if (checkKeyCombo(ev, keyboardCfg.taskToggleDone)) {
    //   task.isDone = !task.isDone;
    //   this.onTaskDoneChanged(task);
    // }
    // if (checkKeyCombo(ev, keyboardCfg.taskAddSubTask)) {
    //   // allow for same keyboard shortcut with the global add task
    //   this.addSubTask(task);
    // }
    //
    // if (checkKeyCombo(ev, keyboardCfg.taskOpenOriginalLink)) {
    //   this.Util.openExternalUrl(task.originalLink);
    // }
    //
    // if (checkKeyCombo(ev, keyboardCfg.togglePlay)) {
    //   this.expandSubTasks(task);
    //   this.togglePlay(task);
    // }
    //
    // if (checkKeyCombo(ev, keyboardCfg.taskDelete)) {
    //   this.deleteTask(task);
    // }
    //
    // if (checkKeyCombo(ev, keyboardCfg.moveToBacklog)) {
    //   this.Tasks.moveTaskFromTodayToBackLog(task);
    //   this.focusClosestTask(taskEl);
    // }
    //
    // if (checkKeyCombo(ev, keyboardCfg.moveToTodaysTasks)) {
    //   this.Tasks.moveTaskFromBackLogToToday(task);
    //   this.focusClosestTask(taskEl);
    // }
    //
    // // move focus up
    // if ((isShiftOrCtrlPressed && ev.keyCode === KEY_UP) || checkKeyCombo(ev, keyboardCfg.selectPreviousTask)) {
    //   this.focusPrevTask(taskEl);
    // }
    // // move focus down
    // if ((isShiftOrCtrlPressed && ev.keyCode === KEY_DOWN) || checkKeyCombo(ev, keyboardCfg.selectNextTask)) {
    //   this.focusNextTask(taskEl);
    // }
    //
    // // expand sub tasks
    // if ((ev.keyCode === KEY_RIGHT) || checkKeyCombo(ev, keyboardCfg.expandSubTasks)) {
    //   // if already opened or is sub task select next task
    //   if ((task.subTasks && task.subTasks.length > 0 && task.isHideSubTasks === false) || this.parentTask) {
    //     this.focusNextTask(taskEl);
    //   }
    //
    //   this.expandSubTasks(task);
    // }
    //
    // // collapse sub tasks
    // if ((ev.keyCode === KEY_LEFT) || checkKeyCombo(ev, keyboardCfg.collapseSubTasks)) {
    //   if (task.subTasks && task.subTasks.length > 0) {
    //     this.collapseSubTasks(task);
    //   }
    //   if (this.parentTask) {
    //     this.focusPrevTask(taskEl);
    //   }
    // }
    //
    // // moving items
    // // move task up
    // if (checkKeyCombo(ev, keyboardCfg.moveTaskUp)) {
    //   const taskIndex = getTaskIndex();
    //   if (taskIndex > 0) {
    //     TaskListCtrl.moveItem(this.tasks, taskIndex, taskIndex - 1);
    //
    //     // we need to manually re-add focus after timeout
    //     this.$timeout(() => {
    //       taskEl.focus();
    //     });
    //   }
    // }
    // // move task down
    // if (checkKeyCombo(ev, keyboardCfg.moveTaskDown)) {
    //   const taskIndex = getTaskIndex();
    //   if (taskIndex < this.tasks.length - 1) {
    //     TaskListCtrl.moveItem(this.tasks, taskIndex, taskIndex + 1);
    //   }
    // }

  }
}
