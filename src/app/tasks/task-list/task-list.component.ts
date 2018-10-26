import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { TaskService } from '../task.service';
import { Task } from '../task.model';
import { DragulaService } from 'ng2-dragula';
import shortid from 'shortid';

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class TaskListComponent implements OnInit, OnDestroy {
  @Input() tasks: Task[];
  @Input() filterArgs: string;
  @Input() focusIdList: string[];

  taskListId: string;
  private subs: Subscription[] = [];

  constructor(private _taskService: TaskService,
              private _dragulaService: DragulaService) {
  }

  ngOnInit() {
    this.taskListId = shortid();
    this._dragulaService.createGroup(this.taskListId, {
      moves: function (el, container, handle) {
        return handle.className.indexOf('handle-par') > -1;
      }
    });
    this.subs.push(this._dragulaService.dropModel(this.taskListId)
      .subscribe((dm) => {
        const targetItemId = dm.targetModel[dm.targetIndex].id;
        // const sourceItemId = dm.sourceModel[dm.sourceIndex].id;
        const sourceItemId = dm.item.id;
        console.log(dm.item, sourceItemId, targetItemId);
        if (sourceItemId !== targetItemId) {
          // this._taskService.moveAfter(sourceItemId, targetItemId);
        }
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
