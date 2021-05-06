import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { CALDAV_TYPE, GITHUB_TYPE, GITLAB_TYPE, JIRA_TYPE } from '../issue.const';

@Component({
  selector: 'issue-header',
  templateUrl: './issue-header.component.html',
  styleUrls: ['./issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueHeaderComponent {
  @Input() task?: TaskWithSubTasks;

  readonly GITLAB_TYPE: string = GITLAB_TYPE;
  readonly GITHUB_TYPE: string = GITHUB_TYPE;
  readonly JIRA_TYPE: string = JIRA_TYPE;
  readonly CALDAV_TYPE: string = CALDAV_TYPE;

  constructor() {}
}
