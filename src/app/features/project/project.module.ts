import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { PROJECT_FEATURE_NAME, projectReducer } from './store/project.reducer';
import { EffectsModule } from '@ngrx/effects';
import { ProjectEffects } from './store/project.effects';
import { ProjectService } from './project.service';
import { DialogCreateProjectComponent } from './dialogs/create-project/dialog-create-project.component';
import { UiModule } from '../../ui/ui.module';
import { JiraViewComponentsModule } from '../issue/providers/jira/jira-view-components/jira-view-components.module';
import { GithubViewComponentsModule } from '../issue/providers/github/github-view-components/github-view-components.module';
import { AzuredevopsViewComponentsModule } from '../issue/providers/azuredevops/azuredevops-view-components/azuredevops-view-components.module';
import { DialogGitlabInitialSetupModule } from '../issue/providers/gitlab/dialog-gitlab-initial-setup/dialog-gitlab-initial-setup.module';
import { DialogCaldavInitialSetupModule } from '../issue/providers/caldav/dialog-caldav-initial-setup/dialog-caldav-initial-setup.module';
import { OpenProjectViewComponentsModule } from '../issue/providers/open-project/open-project-view-components/open-project-view-components.module';
import { GiteaViewComponentsModule } from '../issue/providers/gitea/gitea-view-components/gitea-view-components.module';
import { RedmineViewComponentsModule } from '../issue/providers/redmine/redmine-view-components/redmine-view-components.module';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(PROJECT_FEATURE_NAME, projectReducer),
    EffectsModule.forFeature([ProjectEffects]),
    UiModule,
    JiraViewComponentsModule,
    GithubViewComponentsModule,
    AzuredevopsViewComponentsModule,
    DialogGitlabInitialSetupModule,
    DialogCaldavInitialSetupModule,
    OpenProjectViewComponentsModule,
    GiteaViewComponentsModule,
    RedmineViewComponentsModule,
  ],
  declarations: [DialogCreateProjectComponent],
  providers: [ProjectService],
})
export class ProjectModule {}
