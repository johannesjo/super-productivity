import { NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { SyncEffects } from './sync.effects';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { ConfigModule } from '../../features/config/config.module';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [
    FormsModule,
    UiModule,
    ConfigModule,
    EffectsModule.forFeature([SyncEffects]),
    CommonModule
  ],
  declarations: []
})
export class SyncModule {
}
