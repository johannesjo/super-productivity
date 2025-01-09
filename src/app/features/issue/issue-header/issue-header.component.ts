import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';
import {
  CALDAV_TYPE,
  GITEA_TYPE,
  GITHUB_TYPE,
  GITLAB_TYPE,
  REDMINE_TYPE,
  JIRA_TYPE,
  OPEN_PROJECT_TYPE,
} from '../issue.const';
import { JiraIssueHeaderComponent } from '../providers/jira/jira-issue/jira-issue-header/jira-issue-header.component';
import { GithubIssueHeaderComponent } from '../providers/github/github-issue/github-issue-header/github-issue-header.component';
import { RedmineIssueHeaderComponent } from '../providers/redmine/redmine-issue/redmine-issue-header/redmine-issue-header.component';
import { GitlabIssueHeaderComponent } from '../providers/gitlab/gitlab-issue/gitlab-issue-header/gitlab-issue-header.component';
import { CaldavIssueHeaderComponent } from '../providers/caldav/caldav-issue/caldav-issue-header/caldav-issue-header.component';
import { OpenProjectIssueHeaderComponent } from '../providers/open-project/open-project-issue/open-project-issue-header/open-project-issue-header.component';
import { GiteaIssueHeaderComponent } from '../providers/gitea/gitea-issue/gitea-issue-header/gitea-issue-header.component';

@Component({
  selector: 'issue-header',
  templateUrl: './issue-header.component.html',
  styleUrls: ['./issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    JiraIssueHeaderComponent,
    GithubIssueHeaderComponent,
    RedmineIssueHeaderComponent,
    GitlabIssueHeaderComponent,
    CaldavIssueHeaderComponent,
    OpenProjectIssueHeaderComponent,
    GiteaIssueHeaderComponent,
  ],
})
export class IssueHeaderComponent {
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() task?: TaskWithSubTasks;

  readonly GITLAB_TYPE: string = GITLAB_TYPE;
  readonly GITHUB_TYPE: string = GITHUB_TYPE;
  readonly REDMINE_TYPE: string = REDMINE_TYPE;
  readonly JIRA_TYPE: string = JIRA_TYPE;
  readonly CALDAV_TYPE: string = CALDAV_TYPE;
  readonly OPEN_PROJECT_TYPE: string = OPEN_PROJECT_TYPE;
  readonly GITEA_TYPE: string = GITEA_TYPE;

  constructor() {}
}
