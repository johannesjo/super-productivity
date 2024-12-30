import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { T } from 'src/app/t.const';
import { TaskWithSubTasks } from 'src/app/features/tasks/task.model';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'gitlab-issue-header',
  templateUrl: './gitlab-issue-header.component.html',
  styleUrls: ['./gitlab-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
})
export class GitlabIssueHeaderComponent {
  T: typeof T = T;
  public readonly task = input<TaskWithSubTasks>();

  constructor() {}
}
