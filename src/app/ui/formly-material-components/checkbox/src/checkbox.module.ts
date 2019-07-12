import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormlyModule} from '@ngx-formly/core';
import {ReactiveFormsModule} from '@angular/forms';

import {FormlyMatFormFieldModule} from '../../form-field';
import {MatCheckboxModule} from '@angular/material/checkbox';

import {FormlyFieldCheckbox} from './checkbox.type';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [FormlyFieldCheckbox],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,

    MatCheckboxModule,

    FormlyMatFormFieldModule,
    FormlyModule.forChild({
      types: [
        {
          name: 'checkbox',
          component: FormlyFieldCheckbox,
          wrappers: ['form-field'],
        },
      ],
    }),
  ],
})
export class FormlyMatCheckboxModule {
}
