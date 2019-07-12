import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormlyModule} from '@ngx-formly/core';
import {ReactiveFormsModule} from '@angular/forms';

import {FormlyMatFormFieldModule} from '../../form-field';
import {MatInputModule} from '@angular/material/input';

import {FormlyFieldInput} from './input.type';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [FormlyFieldInput],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    TranslateModule,

    FormlyMatFormFieldModule,
    FormlyModule.forChild({
      types: [
        {
          name: 'input',
          component: FormlyFieldInput,
          wrappers: ['form-field'],
        },
      ],
    }),
  ],
})
export class FormlyMatInputModule {
}
