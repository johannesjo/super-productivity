import { NgModule } from '@angular/core';
import { ScheduleComponent } from './schedule/schedule.component';

@NgModule({
  declarations: [ScheduleComponent],
  imports: [
    // StoreModule.forFeature(plannerFeature),
    // EffectsModule.forFeature([PlannerEffects]),
  ],
})
export class ScheduleModule {}
