import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { CALDAV_TYPE, GITHUB_TYPE, GITLAB_TYPE, JIRA_TYPE } from '../issue.const';
import { IssueData } from '../issue.model';

@Component({
  selector: 'issue-content',
  templateUrl: './issue-content.component.html',
  styleUrls: ['./issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueContentComponent {
  @Input() task?: TaskWithSubTasks;
  @Input() issueData?: IssueData;
  readonly GITLAB_TYPE: string = GITLAB_TYPE;
  readonly GITHUB_TYPE: string = GITHUB_TYPE;
  readonly JIRA_TYPE: string = JIRA_TYPE;
  readonly CALDAV_TYPE: string = CALDAV_TYPE;

  constructor() {}
}
