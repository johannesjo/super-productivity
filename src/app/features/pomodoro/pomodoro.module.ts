import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogPomodoroBreakComponent } from './dialog-pomodoro-break/dialog-pomodoro-break.component';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  declarations: [DialogPomodoroBreakComponent],
  imports: [CommonModule, UiModule],
})
export class PomodoroModule {}
