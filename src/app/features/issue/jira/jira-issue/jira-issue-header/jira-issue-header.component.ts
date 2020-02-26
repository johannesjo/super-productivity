import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {TaskWithSubTasks} from '../../../../tasks/task.model';

@Component({
  selector: 'jira-issue-header',
  templateUrl: './jira-issue-header.component.html',
  styleUrls: ['./jira-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiraIssueHeaderComponent {
  @Input() public task: TaskWithSubTasks;

  constructor() {
  }
}
