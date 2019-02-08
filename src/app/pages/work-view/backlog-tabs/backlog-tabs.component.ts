import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { TaskService } from '../../../features/tasks/task.service';
import { ReminderService } from '../../../features/reminder/reminder.service';

@Component({
  selector: 'backlog-tabs',
  templateUrl: './backlog-tabs.component.html',
  styleUrls: ['./backlog-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogTabsComponent implements OnInit {
  selectedIndex = 1;

  constructor(
    public taskService: TaskService,
    public reminderService: ReminderService,
  ) {
  }

  ngOnInit() {
  }

  indexChange(index) {

  }

  editReminder() {
  }
}
