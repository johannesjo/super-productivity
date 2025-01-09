import { ChangeDetectionStrategy, Component, Input, input } from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';
import {
  CALDAV_TYPE,
  GITEA_TYPE,
  GITHUB_TYPE,
  GITLAB_TYPE,
  JIRA_TYPE,
  OPEN_PROJECT_TYPE,
  REDMINE_TYPE,
} from '../issue.const';
import { IssueData } from '../issue.model';
import { JiraIssueContentComponent } from '../providers/jira/jira-issue/jira-issue-content/jira-issue-content.component';
import { GithubIssueContentComponent } from '../providers/github/github-issue/github-issue-content/github-issue-content.component';
import { RedmineIssueContentComponent } from '../providers/redmine/redmine-issue/redmine-issue-content/redmine-issue-content.component';
import { GitlabIssueContentComponent } from '../providers/gitlab/gitlab-issue/gitlab-issue-content/gitlab-issue-content.component';
import { CaldavIssueContentComponent } from '../providers/caldav/caldav-issue/caldav-issue-content/caldav-issue-content.component';
import { OpenProjectIssueContentComponent } from '../providers/open-project/open-project-issue/open-project-issue-content/open-project-issue-content.component';
import { GiteaIssueContentComponent } from '../providers/gitea/gitea-issue/gitea-issue-content/gitea-issue-content.component';

@Component({
  selector: 'issue-content',
  templateUrl: './issue-content.component.html',
  styleUrls: ['./issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    JiraIssueContentComponent,
    GithubIssueContentComponent,
    RedmineIssueContentComponent,
    GitlabIssueContentComponent,
    CaldavIssueContentComponent,
    OpenProjectIssueContentComponent,
    GiteaIssueContentComponent,
  ],
})
export class IssueContentComponent {
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() task?: TaskWithSubTasks;
  readonly issueData = input<IssueData>();
  readonly GITLAB_TYPE: string = GITLAB_TYPE;
  readonly GITHUB_TYPE: string = GITHUB_TYPE;
  readonly REDMINE_TYPE: string = REDMINE_TYPE;
  readonly JIRA_TYPE: string = JIRA_TYPE;
  readonly CALDAV_TYPE: string = CALDAV_TYPE;
  readonly OPEN_PROJECT_TYPE: string = OPEN_PROJECT_TYPE;
  readonly GITEA_TYPE: string = GITEA_TYPE;

  constructor() {}
}
