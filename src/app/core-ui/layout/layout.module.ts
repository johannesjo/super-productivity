import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { layoutReducer } from './store/layout.reducer';
import { LAYOUT_FEATURE_NAME } from './store/layout.reducer';
import { EffectsModule } from '@ngrx/effects';
import { LayoutEffects } from './store/layout.effects';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(LAYOUT_FEATURE_NAME, layoutReducer),
    EffectsModule.forFeature([LayoutEffects]),
  ],
  declarations: [],
})
export class LayoutModule {}
