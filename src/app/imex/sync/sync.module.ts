import { NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { SyncEffects } from './sync.effects';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { ConfigModule } from '../../features/config/config.module';
import { CommonModule } from '@angular/common';
import { DropboxModule } from './dropbox/dropbox.module';
import { GoogleModule } from './google/google.module';

@NgModule({
  imports: [
    FormsModule,
    UiModule,
    ConfigModule,
    EffectsModule.forFeature([SyncEffects]),
    CommonModule,

    DropboxModule,
    GoogleModule,
  ],
  declarations: []
})
export class SyncModule {
}
