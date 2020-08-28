import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { CONFIG_FEATURE_NAME, globalConfigReducer } from './store/global-config.reducer';
import { EffectsModule } from '@ngrx/effects';
import { GlobalConfigEffects } from './store/global-config.effects';
import { ConfigSectionComponent } from './config-section/config-section.component';
import { ConfigFormComponent } from './config-form/config-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';
import { UiModule } from '../../ui/ui.module';
import { KeyboardInputComponent } from './keyboard-input/keyboard-input.component';
import { GoogleSyncCfgComponent } from '../google/google-sync-cfg/google-sync-cfg.component';
import { FileImexModule } from '../../imex/file-imex/file-imex.module';
import { IconInputComponent } from './icon-input/icon-input.component';
import { SelectProjectComponent } from './select-project/select-project.component';
import { RepeatSectionTypeComponent } from './repeat-section-type/repeat-section-type.component';
import { FormlyMatSliderModule } from '@ngx-formly/material/slider';

@NgModule({
  imports: [
    FormsModule,
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [{
        name: 'keyboard',
        component: KeyboardInputComponent,
        extends: 'input',
        wrappers: ['form-field'],
      }, {
        name: 'icon',
        component: IconInputComponent,
        extends: 'input',
        wrappers: ['form-field'],
      }, {
        name: 'project-select',
        component: SelectProjectComponent,
        // technically no input, but as the properties get us what we need...
        extends: 'input',
        wrappers: ['form-field'],
      }, {
        name: 'repeat',
        component: RepeatSectionTypeComponent,
      }]
    }),
    FormlyMatSliderModule,
    CommonModule,
    StoreModule.forFeature(CONFIG_FEATURE_NAME, globalConfigReducer),
    EffectsModule.forFeature([GlobalConfigEffects]),
    UiModule,
    FileImexModule,
  ],
  declarations: [
    GoogleSyncCfgComponent,
    ConfigSectionComponent,
    ConfigFormComponent,
    KeyboardInputComponent,
    IconInputComponent,
    SelectProjectComponent,
    RepeatSectionTypeComponent,
  ],
  exports: [
    ConfigSectionComponent,
    ConfigFormComponent
  ],
})
export class ConfigModule {
}
