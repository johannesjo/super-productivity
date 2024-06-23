import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';
import {
  CALDAV_TYPE,
  GITEA_TYPE,
  GITHUB_TYPE,
  GITLAB_TYPE,
  AZUREDEVOPS_TYPE,
  REDMINE_TYPE,
  JIRA_TYPE,
  OPEN_PROJECT_TYPE,
} from '../issue.const';

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
  readonly AZUREDEVOPS_TYPE: string = AZUREDEVOPS_TYPE;
  readonly REDMINE_TYPE: string = REDMINE_TYPE;
  readonly JIRA_TYPE: string = JIRA_TYPE;
  readonly CALDAV_TYPE: string = CALDAV_TYPE;
  readonly OPEN_PROJECT_TYPE: string = OPEN_PROJECT_TYPE;
  readonly GITEA_TYPE: string = GITEA_TYPE;

  constructor() {}
}
