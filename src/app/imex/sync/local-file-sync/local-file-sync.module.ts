import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { LocalFileSyncElectronEffects } from './store/local-file-sync-electron.effects';
import { IS_ELECTRON } from '../../../app.constants';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    IS_ELECTRON ? [EffectsModule.forFeature([LocalFileSyncElectronEffects])] : [],
  ],
})
export class LocalFileSyncModule {}
