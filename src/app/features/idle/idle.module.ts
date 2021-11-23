import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { TasksModule } from '../tasks/tasks.module';
import { DialogIdleComponent } from './dialog-idle/dialog-idle.component';
import { StoreModule } from '@ngrx/store';
import { IDLE_FEATURE_KEY, idleReducer } from './store/idle.reducer';
import { EffectsModule } from '@ngrx/effects';
import { IdleEffects } from './store/idle.effects';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    TasksModule,
    StoreModule.forFeature(IDLE_FEATURE_KEY, idleReducer),
    EffectsModule.forFeature([IdleEffects]),
  ],
  declarations: [DialogIdleComponent],
})
export class IdleModule {}
