import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { TaskService } from '../task.service';
import { Task } from '../task';
import { DragulaService } from 'ng2-dragula';
import shortid from 'shortid';

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  providers: [TaskService],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class TaskListComponent implements OnInit, OnDestroy {
  @Input() tasks$: Observable<[Task]>;
  @Input() filterArgs: string;
  taskListId: string;
  private subs: Subscription[] = [];

  constructor(private _taskService: TaskService,
              private _dragulaService: DragulaService) {
  }

  ngOnInit() {
    this.taskListId = shortid();
    this._dragulaService.setOptions(this.taskListId, {
      moves: function (el, container, handle) {
        return handle.className.indexOf('handle-par') > -1;
      }
    });
    this.subs.push(this._dragulaService.dropModel.subscribe(() => {
      this._taskService.sync();
    }));
  }

  ngOnDestroy() {
    this.subs.forEach((sub) => sub && sub.unsubscribe());
  }

  trackByFn(i: number, task: Task) {
    return task.id;
  }

  focusLastFocusedTaskEl() {
  }
}
