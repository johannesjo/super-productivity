import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {StoreModule} from '@ngrx/store';
import {PROJECT_FEATURE_NAME, projectReducer} from './store/project.reducer';
import {EffectsModule} from '@ngrx/effects';
import {ProjectEffects} from './store/project.effects';
import {ProjectService} from './project.service';
import {DialogCreateProjectComponent} from './dialogs/create-project/dialog-create-project.component';
import {UiModule} from '../../ui/ui.module';
import {JiraViewComponentsModule} from '../issue/jira/jira-view-components/jira-view-components.module';
import {GithubModule} from '../issue/github/github.module';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(PROJECT_FEATURE_NAME, projectReducer),
    EffectsModule.forFeature([ProjectEffects]),
    UiModule,
    JiraViewComponentsModule,
    GithubModule,
  ],
  declarations: [
    DialogCreateProjectComponent,
  ],
  providers: [
    ProjectService
  ],
  entryComponents: [
    DialogCreateProjectComponent,
  ]
})
export class ProjectModule {
}
