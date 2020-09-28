import { NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { SyncEffects } from './sync.effects';
import { SyncCfgComponent } from './sync-cfg/sync-cfg.component';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  imports: [
    FormsModule,
    UiModule,
    EffectsModule.forFeature([SyncEffects])
  ],
  declarations: [SyncCfgComponent]
})
export class SyncModule {
}
