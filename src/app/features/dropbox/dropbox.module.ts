import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {EffectsModule} from '@ngrx/effects';
import {DropboxEffects} from './store/dropbox.effects';
import {DropboxCfgComponent} from './dropbox-cfg/dropbox-cfg.component';


@NgModule({
  declarations: [DropboxCfgComponent],
  imports: [
    CommonModule,
    EffectsModule.forFeature([DropboxEffects])
  ]
})
export class DropboxModule {
}
