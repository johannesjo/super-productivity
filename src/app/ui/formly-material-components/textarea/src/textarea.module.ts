import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormlyModule} from '@ngx-formly/core';
import {ReactiveFormsModule} from '@angular/forms';

import {FormlyMatFormFieldModule} from '../../form-field';
import {MatInputModule} from '@angular/material/input';

import {FormlyFieldTextArea} from './textarea.type';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [FormlyFieldTextArea],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    TranslateModule,

    FormlyMatFormFieldModule,
    FormlyModule.forChild({
      types: [
        {
          name: 'textarea',
          component: FormlyFieldTextArea,
          wrappers: ['form-field'],
        },
      ],
    }),
  ],
})
export class FormlyMatTextAreaModule {
}
