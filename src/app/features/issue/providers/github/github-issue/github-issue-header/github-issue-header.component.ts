import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';

@Component({
  selector: 'github-issue-header',
  templateUrl: './github-issue-header.component.html',
  styleUrls: ['./github-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GithubIssueHeaderComponent {
  T: typeof T = T;
  @Input() task?: TaskWithSubTasks;

  constructor() {
  }
}
