import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { projectReducer } from './store/project.reducer';
import { PROJECT_FEATURE_NAME } from './store/project.reducer';
import { EffectsModule } from '@ngrx/effects';
import { ProjectEffects } from './store/project.effects';
import { CoreModule } from '../core/core.module';
import { ProjectService } from './project.service';
import { DialogCreateProjectComponent } from './dialogs/create-project/dialog-create-project.component';
import { UiModule } from '../ui/ui.module';
import { EditProjectFormComponent } from './edit-project-form/edit-project-form.component';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
    StoreModule.forFeature(PROJECT_FEATURE_NAME, projectReducer),
    EffectsModule.forFeature([ProjectEffects]),
  ],
  declarations: [
    EditProjectFormComponent,
    DialogCreateProjectComponent,
  ],
  providers: [
    ProjectService
  ],
  exports: [
    EditProjectFormComponent,
    DialogCreateProjectComponent,
  ],
  entryComponents: [
    DialogCreateProjectComponent,
  ]
})
export class ProjectModule {
}
