import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Task } from '../task.model';
import { TaskService } from '../task.service';
import { DragulaService } from 'ng2-dragula';
import { Subscription } from 'rxjs';

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class TaskListComponent implements OnDestroy, OnInit {
  @Input() tasks: Task[];
  @Input() filterArgs: string;
  @Input() focusIdList: string[];
  @Input() parentId: string;
  @Input() listId: string;
  @Input() listModelId: string;
  @ViewChild('listEl') listEl;
  subs = new Subscription();

  constructor(
    private _taskService: TaskService,
    private _dragulaService: DragulaService,
  ) {

  }

  ngOnInit() {
    this.subs.add(this._dragulaService.dropModel(this.listId)
      .subscribe(({el, target, source, sourceModel, targetModel, item}) => {
        console.log('---------', this.listEl.nativeElement === target);
        if (this.listEl.nativeElement === target) {
          const sourceModelId = source.dataset.id;
          const targetModelId = target.dataset.id;
          const targetNewIds = targetModel.map((task) => task.id);
          const movedTaskId = item.id;
          console.log(sourceModelId, targetModelId, targetNewIds, movedTaskId);
          this._taskService.move(movedTaskId, sourceModelId, targetModelId, targetNewIds);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  trackByFn(i: number, task: Task) {
    return task.id;
  }
}
