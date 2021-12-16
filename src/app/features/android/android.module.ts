import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { AndroidEffects } from './store/android.effects';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    EffectsModule.forFeature([...(IS_ANDROID_WEB_VIEW ? [AndroidEffects] : [])]),
  ],
})
export class AndroidModule {}
