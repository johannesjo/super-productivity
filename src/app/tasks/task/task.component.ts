import { Component, DoCheck, HostBinding, Input, OnInit } from '@angular/core';
import { TaskService } from '../task.service';
import { Observable } from 'rxjs';
import { DragulaService } from 'ng2-dragula';
import { Task } from '../task';
import shortid from 'shortid';
import { MatDialog } from '@angular/material';
import { DialogTimeEstimateComponent } from '../dialogs/dialog-time-estimate/dialog-time-estimate.component';
import { expandAnimation } from '../../animations/expand.ani';

// import {Task} from './task'

@Component({
  selector: 'task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  host: {
    'class': 'mat-elevation-z4'
  },
  // changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class TaskComponent implements OnInit, DoCheck {
  // @Input() task: Task;
  @Input() task: any;
  @HostBinding('class.is-done') isDone = false;
  @HostBinding('class.is-current') isCurrent = false;
  isShowNotes = false;
  currentTaskId$: Observable<string>;
  subTaskListId: string;

  constructor(private taskService: TaskService, private _dragulaService: DragulaService, public dialog: MatDialog) {
  }

  ngDoCheck() {
    this.isDone = this.task.isDone;
  }

  ngOnInit() {
    this.currentTaskId$ = this.taskService.currentTaskId$;
    this.currentTaskId$.subscribe((val) => {
      this.isCurrent = (this.task && val === this.task.id);
    });

    this.subTaskListId = shortid();
    this._dragulaService.setOptions(this.subTaskListId, {
      moves: function (el, container, handle) {
        return handle.className.indexOf('handle-sub') > -1;
      }
    });
  }

  deleteTask(taskId: string) {
    this.taskService.deleteTask(taskId);
  }


  startTask(taskId: string) {
    this.taskService.setCurrentTask(taskId);
  }

  pauseTask() {
    this.taskService.pauseCurrentTask();
  }

  updateTaskIfChanged(isChanged, idToEdit, task) {
    if (isChanged) {
      this.updateTask(idToEdit, task);
    }
  }

  updateTask(idToEdit: string, taskTitle: string) {
    this.taskService.updateTask(idToEdit, {title: taskTitle});
    // todo focus task again
  }

  estimateTime(task: Task) {
    this.dialog
      .open(DialogTimeEstimateComponent, {
        data: {task},
      })
      .afterClosed()
      .subscribe(result => {
        console.log(result);
      });
  }

  addSubTask(task: Task) {
    this.taskService.addSubTask(task);
  }

  // TODO refactor to action ?
  onTaskDoneChanged(taskId: string, isDone: boolean) {
    if (isDone) {
      this.taskService.setTaskDone(taskId);
    } else {
      this.taskService.setTaskUnDone(taskId);
    }
  }

  focusTask() {
  }


  onTaskNotesChanged(idToEdit: string, $event) {
    this.taskService.updateTask(idToEdit, {notes: $event.newVal});
  }
}
