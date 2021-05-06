import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { PomodoroEffects } from './store/pomodoro.effects';
import { POMODORO_FEATURE_NAME, pomodoroReducer } from './store/pomodoro.reducer';
import { DialogPomodoroBreakComponent } from './dialog-pomodoro-break/dialog-pomodoro-break.component';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  declarations: [DialogPomodoroBreakComponent],
  imports: [
    CommonModule,
    UiModule,
    StoreModule.forFeature(POMODORO_FEATURE_NAME, pomodoroReducer),
    EffectsModule.forFeature([PomodoroEffects]),
  ],
})
export class PomodoroModule {}
