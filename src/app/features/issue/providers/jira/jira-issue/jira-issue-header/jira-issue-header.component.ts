import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { isOnline$ } from 'src/app/util/is-online';

@Component({
  selector: 'jira-issue-header',
  templateUrl: './jira-issue-header.component.html',
  styleUrls: ['./jira-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiraIssueHeaderComponent {
  @Input() public task: TaskWithSubTasks;
  isOnline$ = isOnline$;

  constructor() {
  }
}
