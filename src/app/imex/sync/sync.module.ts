import { NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { SyncEffects } from './sync.effects';

@NgModule({
  imports: [
    EffectsModule.forFeature([SyncEffects])
  ]
})
export class SyncModule {
}
