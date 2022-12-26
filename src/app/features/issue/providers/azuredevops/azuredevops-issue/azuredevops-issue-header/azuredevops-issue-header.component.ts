import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';

@Component({
  selector: 'azuredevops-issue-header',
  templateUrl: './azuredevops-issue-header.component.html',
  styleUrls: ['./azuredevops-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AzuredevopsIssueHeaderComponent {
  T: typeof T = T;
  @Input() task?: TaskWithSubTasks;

  constructor() {}
}
