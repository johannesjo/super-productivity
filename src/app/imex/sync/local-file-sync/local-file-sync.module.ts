import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { LocalFileSyncElectronEffects } from './store/local-file-sync-electron.effects';

@NgModule({
  declarations: [],
  imports: [CommonModule, EffectsModule.forFeature([LocalFileSyncElectronEffects])],
})
export class LocalFileSyncModule {}
