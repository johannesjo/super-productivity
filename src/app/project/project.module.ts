import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { PROJECT_FEATURE_NAME, projectReducer } from './store/project.reducer';
import { EffectsModule } from '@ngrx/effects';
import { ProjectEffects } from './store/project.effects';
import { CoreModule } from '../core/core.module';
import { ProjectService } from './project.service';
import { DialogCreateProjectComponent } from './dialogs/create-project/dialog-create-project.component';
import { UiModule } from '../ui/ui.module';
import { JiraModule } from '../issue/jira/jira.module';
import { GitModule } from '../issue/git/git.module';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
    JiraModule,
    GitModule,
    StoreModule.forFeature(PROJECT_FEATURE_NAME, projectReducer),
    EffectsModule.forFeature([ProjectEffects]),
  ],
  declarations: [
    DialogCreateProjectComponent,
  ],
  providers: [
    ProjectService
  ],
  exports: [
    DialogCreateProjectComponent,
  ],
  entryComponents: [
    DialogCreateProjectComponent,
  ]
})
export class ProjectModule {
}
