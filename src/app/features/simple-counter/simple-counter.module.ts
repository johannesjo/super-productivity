import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SimpleCounterButtonComponent} from './simple-counter-button/simple-counter-button.component';
import {UiModule} from '../../ui/ui.module';
import {StoreModule} from '@ngrx/store';
import {SIMPLE_COUNTER_FEATURE_NAME, simpleCounterReducer} from './store/simple-counter.reducer';
import {EffectsModule} from '@ngrx/effects';
import {SimpleCounterEffects} from './store/simple-counter.effects';
import { SimpleCounterCfgComponent } from './simple-counter-cfg/simple-counter-cfg.component';

@NgModule({
  declarations: [
    SimpleCounterButtonComponent,
    SimpleCounterCfgComponent,
  ],
  exports: [
    SimpleCounterButtonComponent,
    SimpleCounterCfgComponent,
  ],
  imports: [
    CommonModule,
    UiModule,
    StoreModule.forFeature(SIMPLE_COUNTER_FEATURE_NAME, simpleCounterReducer),
    EffectsModule.forFeature([SimpleCounterEffects])
  ]
})
export class SimpleCounterModule {
}
