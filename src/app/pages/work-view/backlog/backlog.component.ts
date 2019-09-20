import {ChangeDetectionStrategy, Component, EventEmitter, Output} from '@angular/core';
import {TaskService} from '../../../features/tasks/task.service';
import {TaskWithReminderData} from '../../../features/tasks/task.model';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {T} from '../../../t.const';

@Component({
  selector: 'backlog',
  templateUrl: './backlog.component.html',
  styleUrls: ['./backlog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class BacklogComponent {
  T = T;

  @Output() closeBacklog = new EventEmitter<any>();

  constructor(
    public taskService: TaskService,
  ) {
  }


  trackByFn(i: number, task: TaskWithReminderData) {
    return task.id;
  }


  removeReminder(task: TaskWithReminderData) {
    this.taskService.removeReminder(task.id, task.reminderId);
  }

}
