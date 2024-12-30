import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'gitea-issue-header',
  templateUrl: './gitea-issue-header.component.html',
  styleUrls: ['./gitea-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
})
export class GiteaIssueHeaderComponent {
  T: typeof T = T;
  readonly task = input<TaskWithSubTasks>();

  constructor() {}
}
