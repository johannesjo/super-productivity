import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'open-project-issue-header',
  templateUrl: './open-project-issue-header.component.html',
  styleUrls: ['./open-project-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
})
export class OpenProjectIssueHeaderComponent {
  T: typeof T = T;
  readonly task = input<TaskWithSubTasks>();

  constructor() {}
}
