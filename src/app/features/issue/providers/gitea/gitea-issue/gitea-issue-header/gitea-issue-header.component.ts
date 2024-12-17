import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';

@Component({
  selector: 'gitea-issue-header',
  templateUrl: './gitea-issue-header.component.html',
  styleUrls: ['./gitea-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class GiteaIssueHeaderComponent {
  T: typeof T = T;
  @Input() task?: TaskWithSubTasks;

  constructor() {}
}
