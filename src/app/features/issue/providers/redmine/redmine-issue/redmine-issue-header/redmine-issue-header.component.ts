import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';

@Component({
  selector: 'redmine-issue-header',
  templateUrl: './redmine-issue-header.component.html',
  styleUrls: ['./redmine-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class RedmineIssueHeaderComponent {
  T: typeof T = T;
  @Input() task?: TaskWithSubTasks;

  constructor() {}
}
