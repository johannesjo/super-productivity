import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'github-issue-header',
  templateUrl: './github-issue-header.component.html',
  styleUrls: ['./github-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
})
export class GithubIssueHeaderComponent {
  T: typeof T = T;
  readonly task = input<TaskWithSubTasks>();

  constructor() {}
}
