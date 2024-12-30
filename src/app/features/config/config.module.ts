import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigSectionComponent } from './config-section/config-section.component';
import { ConfigFormComponent } from './config-form/config-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';
import { UiModule } from '../../ui/ui.module';
import { KeyboardInputComponent } from './keyboard-input/keyboard-input.component';
import { FileImexModule } from '../../imex/file-imex/file-imex.module';
import { IconInputComponent } from './icon-input/icon-input.component';
import { SelectProjectComponent } from './select-project/select-project.component';
import { RepeatSectionTypeComponent } from './repeat-section-type/repeat-section-type.component';
import { FormlyMatSliderModule } from '@ngx-formly/material/slider';
import { ConfigSoundFormComponent } from './config-sound-form/config-sound-form.component';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    FormsModule,
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [
        {
          name: 'keyboard',
          component: KeyboardInputComponent,
          extends: 'input',
          wrappers: ['form-field'],
        },
        {
          name: 'icon',
          component: IconInputComponent,
          extends: 'input',
          wrappers: ['form-field'],
        },
        {
          name: 'project-select',
          component: SelectProjectComponent,
          // technically no input, but as the properties get us what we need...
          extends: 'input',
          wrappers: ['form-field'],
        },
        {
          name: 'repeat',
          component: RepeatSectionTypeComponent,
        },
      ],
    }),
    FormlyMatSliderModule,
    CommonModule,

    UiModule,
    FileImexModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatInputModule,
    TranslateModule,
  ],
  declarations: [
    ConfigSectionComponent,
    ConfigFormComponent,
    KeyboardInputComponent,
    IconInputComponent,
    SelectProjectComponent,
    RepeatSectionTypeComponent,
    ConfigSoundFormComponent,
  ],
  exports: [ConfigSectionComponent, ConfigFormComponent, ConfigSoundFormComponent],
})
export class ConfigModule {}
