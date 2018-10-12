import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import * as fromConfig from './store/config.reducer';
import { EffectsModule } from '@ngrx/effects';
import { ConfigEffects } from './store/config.effects';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature('config', fromConfig.reducer),
    EffectsModule.forFeature([ConfigEffects])
  ],
  declarations: []
})
export class ConfigModule {
}
