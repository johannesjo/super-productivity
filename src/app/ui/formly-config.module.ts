import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FORMLY_CONFIG, FormlyModule } from '@ngx-formly/core';
import { InputDurationFormlyComponent } from './duration/input-duration-formly/input-duration-formly.component';
import { ValidationModule } from './validation/validation.module';
import { TranslateService } from '@ngx-translate/core';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { registerTranslateExtension } from './formly-translate-extension/formly-translate-extension';
import { FormlyTranslatedTemplateComponent } from './formly-translated-template/formly-translated-template.component';
import { FormlyMatToggleModule } from '@ngx-formly/material/toggle';
import { FormlyLinkWidgetComponent } from './formly-link-widget/formly-link-widget.component';
import { FormlyMatDatepickerModule } from '@ngx-formly/material/datepicker';
import { FormlyCollapsibleComponent } from './formly-collapsible/formly-collapsible.component';
import { KeyboardInputComponent } from '../features/config/keyboard-input/keyboard-input.component';
import { IconInputComponent } from '../features/config/icon-input/icon-input.component';
import { SelectProjectComponent } from '../features/config/select-project/select-project.component';
import { RepeatSectionTypeComponent } from '../features/config/repeat-section-type/repeat-section-type.component';
import { FormlyMatSliderModule } from '@ngx-formly/material/slider';
import { FormlyTagSelectionComponent } from './formly-tag-selection/formly-tag-selection.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    FormlyMatSliderModule,
    ReactiveFormsModule,
    FormlyModule.forRoot({
      validationMessages: [{ name: 'pattern', message: 'Invalid input' }],
      types: [
        { name: 'link', component: FormlyLinkWidgetComponent },
        {
          name: 'duration',
          component: InputDurationFormlyComponent,
          extends: 'input',
          wrappers: ['form-field'],
        },
        {
          name: 'tpl',
          component: FormlyTranslatedTemplateComponent,
        },
        { name: 'collapsible', component: FormlyCollapsibleComponent, wrappers: [] },
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
          name: 'tag-select',
          component: FormlyTagSelectionComponent,
          // technically no input, but as the properties get us what we need...
          extends: 'input',
          wrappers: ['form-field'],
        },
        {
          name: 'repeat',
          component: RepeatSectionTypeComponent,
        },
      ],
      extras: {
        immutable: true,
      },
    }),
    FormlyMatToggleModule,
    FormlyMaterialModule,
    FormlyMatDatepickerModule,
    // my modules
    // might be needed for formly to pick up on directives
    ValidationModule,
    FormlyLinkWidgetComponent,
  ],
  exports: [
    FormlyMaterialModule,
    FormlyModule,
    MarkdownModule,
    ReactiveFormsModule,
    ValidationModule,
  ],
  providers: [
    {
      provide: FORMLY_CONFIG,
      multi: true,
      useFactory: registerTranslateExtension,
      deps: [TranslateService],
    },
  ],
})
export class FormlyConfigModule {}
