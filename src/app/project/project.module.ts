import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { projectReducer } from './store/project.reducer';
import { PROJECT_FEATURE_NAME } from './store/project.reducer';
import { EffectsModule } from '@ngrx/effects';
import { ProjectEffects } from './store/project.effects';
import { CoreModule } from '../core/core.module';
import { ProjectService } from './project.service';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    StoreModule.forFeature(PROJECT_FEATURE_NAME, projectReducer),
    EffectsModule.forFeature([ProjectEffects])
  ],
  declarations: [],
  providers: [
    ProjectService
  ]
})
export class ProjectModule {
}
