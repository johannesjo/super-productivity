import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { PROJECT_FEATURE_NAME, projectReducer } from './store/project.reducer';
import { EffectsModule } from '@ngrx/effects';
import { ProjectEffects } from './store/project.effects';
import { ProjectService } from './project.service';
import { DialogCreateProjectComponent } from './dialogs/create-project/dialog-create-project.component';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(PROJECT_FEATURE_NAME, projectReducer),
    EffectsModule.forFeature([ProjectEffects]),
    UiModule,
  ],
  declarations: [DialogCreateProjectComponent],
  providers: [ProjectService],
})
export class ProjectModule {}
