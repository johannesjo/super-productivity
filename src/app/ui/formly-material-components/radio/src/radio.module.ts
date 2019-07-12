import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormlyModule} from '@ngx-formly/core';
import {ReactiveFormsModule} from '@angular/forms';
import {FormlySelectModule} from '@ngx-formly/core/select';

import {FormlyMatFormFieldModule} from '../../form-field';
import {MatRadioModule} from '@angular/material/radio';

import {FormlyFieldRadio} from './radio.type';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [FormlyFieldRadio],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatRadioModule,
    TranslateModule,

    FormlyMatFormFieldModule,
    FormlySelectModule,
    FormlyModule.forChild({
      types: [{
        name: 'radio',
        component: FormlyFieldRadio,
        wrappers: ['form-field'],
      }],
    }),
  ],
})
export class FormlyMatRadioModule {
}
