import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../../ui/ui.module';
import { EffectsModule } from '@ngrx/effects';
import { GoogleDriveSyncEffects } from './store/google-drive-sync.effects';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    EffectsModule.forFeature([GoogleDriveSyncEffects]),
  ],
  declarations: [],
  exports: [],
})
export class GoogleModule {}
