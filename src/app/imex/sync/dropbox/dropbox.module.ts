import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { DropboxEffects } from './store/dropbox.effects';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../../ui/ui.module';

@NgModule({
  exports: [],
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    EffectsModule.forFeature([DropboxEffects]),
  ],
})
export class DropboxModule {}
