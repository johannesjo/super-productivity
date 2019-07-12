import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormlyModule} from '@ngx-formly/core';
import {FormlySelectModule} from '@ngx-formly/core/select';
import {ReactiveFormsModule} from '@angular/forms';

import {FormlyMatFormFieldModule} from '../../form-field';
import {MatInputModule} from '@angular/material/input';

import {FormlyFieldNativeSelect} from './native-select.type';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [FormlyFieldNativeSelect],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    TranslateModule,

    FormlyMatFormFieldModule,
    FormlySelectModule,
    FormlyModule.forChild({
      types: [
        {
          name: 'native-select',
          component: FormlyFieldNativeSelect,
          wrappers: ['form-field'],
        },
      ],
    }),
  ],
})
export class FormlyMatNativeSelectModule {
}
