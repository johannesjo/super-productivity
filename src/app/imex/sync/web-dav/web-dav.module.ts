import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { WebDavEffects } from './store/web-dav-effects.service';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../../ui/ui.module';

@NgModule({
  declarations: [],
  exports: [],
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    EffectsModule.forFeature([WebDavEffects])
  ]
})
export class WebDavModule {
}
