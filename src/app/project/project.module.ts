import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import * as fromProject from './store/project.reducer';
import { EffectsModule } from '@ngrx/effects';
import { ProjectEffects } from './store/project.effects';
import { CoreModule } from '../core/core.module';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    StoreModule.forFeature('project', fromProject.reducer),
    EffectsModule.forFeature([ProjectEffects])
  ],
  declarations: []
})
export class ProjectModule {
}
