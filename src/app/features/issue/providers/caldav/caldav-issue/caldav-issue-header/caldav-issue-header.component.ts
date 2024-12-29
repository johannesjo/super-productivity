import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { T } from 'src/app/t.const';
import { TaskWithSubTasks } from 'src/app/features/tasks/task.model';

@Component({
  selector: 'caldav-issue-header',
  templateUrl: './caldav-issue-header.component.html',
  styleUrls: ['./caldav-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CaldavIssueHeaderComponent {
  T: typeof T = T;
  public readonly task = input<TaskWithSubTasks>();

  constructor() {}
}
