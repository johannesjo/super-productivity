import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {IntelligentListEffects} from './store/intelligent-list.effects';
import {INTELLIGENT_LIST_FEATURE_NAME, intelligentListReducer} from './store/intelligent-list.reducer';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(INTELLIGENT_LIST_FEATURE_NAME, intelligentListReducer),
    EffectsModule.forFeature([IntelligentListEffects])
  ],
  declarations: [],
  entryComponents: [],
  exports: [],
})
export class IntelligentListModule {
}
