import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {ContextEffects} from './store/context.effects';
import {CONTEXT_FEATURE_NAME, contextReducer} from './store/context.reducer';

@NgModule({
    imports: [
        CommonModule,
        StoreModule.forFeature(CONTEXT_FEATURE_NAME, contextReducer),
        EffectsModule.forFeature([ContextEffects])
    ],
    declarations: [],
    entryComponents: [],
    exports: [],
})
export class ContextModule {
}
