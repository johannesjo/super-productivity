import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraIssueModule } from './providers/jira/jira-issue/jira-issue.module';
import { IssueHeaderComponent } from './issue-header/issue-header.component';
import { IssueContentComponent } from './issue-content/issue-content.component';
import { GithubIssueModule } from './providers/github/github-issue/github-issue.module';
import { RedmineIssueModule } from './providers/redmine/redmine-issue/redmine-issue.module';
import { IssueIconPipe } from './issue-icon/issue-icon.pipe';
import { GitlabIssueModule } from './providers/gitlab/gitlab-issue/gitlab-issue.module';
import { CaldavIssueModule } from './providers/caldav/caldav-issue/caldav-issue.module';
import { OpenProjectIssueModule } from './providers/open-project/open-project-issue/open-project-issue.module';
import { GiteaIssueModule } from './providers/gitea/gitea-issue/gitea-issue.module';
import { EffectsModule } from '@ngrx/effects';
import { PollToBacklogEffects } from './store/poll-to-backlog.effects';
import { PollIssueUpdatesEffects } from './store/poll-issue-updates.effects';
import { StoreModule } from '@ngrx/store';
import { IssueProviderDbEffects } from './store/issue-provider-db.effects';
import { issueProvidersFeature } from './store/issue-provider.reducer';
import { ProjectToIssueProviderMigrationEffects } from './store/project-to-issue-provider-migration.effects';

@NgModule({
  imports: [
    CommonModule,
    JiraIssueModule,
    GithubIssueModule,
    RedmineIssueModule,
    GitlabIssueModule,
    CaldavIssueModule,
    OpenProjectIssueModule,
    GiteaIssueModule,
    StoreModule.forFeature(issueProvidersFeature),
    EffectsModule.forFeature([
      PollToBacklogEffects,
      PollIssueUpdatesEffects,
      IssueProviderDbEffects,
      ProjectToIssueProviderMigrationEffects,
    ]),
  ],
  declarations: [IssueHeaderComponent, IssueContentComponent, IssueIconPipe],
  exports: [IssueHeaderComponent, IssueContentComponent, IssueIconPipe],
})
export class IssueModule {}
