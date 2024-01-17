import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { CalendarIntegrationEffects } from './store/calendar-integration.effects';

@NgModule({
  declarations: [],
  imports: [CommonModule, EffectsModule.forFeature([CalendarIntegrationEffects])],
})
export class CalendarIntegrationModule {}
