import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Task } from '../task.model';
import { TaskService } from '../task.service';

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class TaskListComponent {
  @Input() tasks: Task[];
  @Input() filterArgs: string;
  @Input() focusIdList: string[];
  @Input() parentId: string;
  @Input() listId: string;
  @Input() listModelId: string;

  constructor(private _taskService: TaskService) {
  }


  trackByFn(i: number, task: Task) {
    return task.id;
  }

  updateList(ev) {
    console.log(this.listId, this.parentId, ev);
  }
}
