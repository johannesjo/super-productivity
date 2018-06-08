import {Component, Input, OnInit} from '@angular/core';
import {ChangeDetectionStrategy} from '@angular/core';
import {Observable} from 'rxjs';
import {TaskService} from './task.service';
import {Task} from './task'
import {DragulaService} from 'ng2-dragula';
import shortid from 'shortid'

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  providers: [TaskService],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class TaskListComponent implements OnInit {
  @Input() tasks$: Observable<[Task]>;
  @Input() filterArgs: string;

  taskListId: string;

  constructor(private _taskService: TaskService, private _dragulaService: DragulaService) {
    this.taskListId = shortid();

    _dragulaService.dropModel.subscribe(() => {
      _taskService.sync();
    });
    _dragulaService.setOptions(this.taskListId, {
      moves: function (el, container, handle) {
        return handle.className.indexOf('handle-par') > -1;
      }
    });
  }

  ngOnInit() {
  }

  focusLastFocusedTaskEl() {
  }
}
