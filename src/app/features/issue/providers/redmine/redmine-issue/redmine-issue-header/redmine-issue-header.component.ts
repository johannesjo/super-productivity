import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'redmine-issue-header',
  templateUrl: './redmine-issue-header.component.html',
  styleUrls: ['./redmine-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
})
export class RedmineIssueHeaderComponent {
  T: typeof T = T;
  readonly task = input<TaskWithSubTasks>();

  constructor() {}
}
