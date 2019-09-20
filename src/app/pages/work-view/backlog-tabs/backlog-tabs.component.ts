import {ChangeDetectionStrategy, Component, EventEmitter, Output} from '@angular/core';
import {TaskService} from '../../../features/tasks/task.service';
import {TaskWithReminderData} from '../../../features/tasks/task.model';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {T} from '../../../t.const';

@Component({
  selector: 'backlog-tabs',
  templateUrl: './backlog-tabs.component.html',
  styleUrls: ['./backlog-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class BacklogTabsComponent {
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
