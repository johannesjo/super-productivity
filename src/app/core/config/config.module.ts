import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { CONFIG_FEATURE_NAME, configReducer } from './store/config.reducer';
import { EffectsModule } from '@ngrx/effects';
import { ConfigEffects } from './store/config.effects';
import { ConfigSectionComponent } from './config-section/config-section.component';
import { ConfigFormComponent } from './config-form/config-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { ConfigService } from './config.service';
import { UiModule } from '../../ui/ui.module';
import { KeyboardInputComponent } from './keyboard-input/keyboard-input.component';
import { GoogleModule } from '../google/google.module';

@NgModule({
  imports: [
    UiModule,
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [{
        name: 'keyboard',
        component: KeyboardInputComponent,
        extends: 'input',
        wrappers: ['form-field'],
      }]
    }),
    FormlyMaterialModule,
    CommonModule,
    GoogleModule,
    StoreModule.forFeature(CONFIG_FEATURE_NAME, configReducer),
    EffectsModule.forFeature([ConfigEffects])
  ],
  declarations: [
    ConfigSectionComponent,
    ConfigFormComponent,
    KeyboardInputComponent
  ],
  exports: [
    ConfigSectionComponent,
    ConfigFormComponent
  ],
  providers: [
    ConfigService
  ]
})
export class ConfigModule {
}
