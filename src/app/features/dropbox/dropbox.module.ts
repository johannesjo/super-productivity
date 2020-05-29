import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {EffectsModule} from '@ngrx/effects';
import {DropboxEffects} from './store/dropbox.effects';
import {DropboxCfgComponent} from './dropbox-cfg/dropbox-cfg.component';
import {FormsModule} from '@angular/forms';
import {UiModule} from '../../ui/ui.module';


@NgModule({
  declarations: [
    DropboxCfgComponent,
  ],
  exports: [
    DropboxCfgComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    EffectsModule.forFeature([DropboxEffects])
  ]
})
export class DropboxModule {
}
