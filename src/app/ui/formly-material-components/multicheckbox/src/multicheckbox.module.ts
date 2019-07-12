import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {FormlyModule} from '@ngx-formly/core';
import {FormlySelectModule} from '@ngx-formly/core/select';
import {FormlyMatFormFieldModule} from '@ngx-formly/material/form-field';
import {MatCheckboxModule} from '@angular/material/checkbox';

import {FormlyFieldMultiCheckbox} from './multicheckbox.type';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [FormlyFieldMultiCheckbox],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,

    MatCheckboxModule,

    FormlyMatFormFieldModule,
    FormlySelectModule,
    FormlyModule.forChild({
      types: [
        {
          name: 'multicheckbox',
          component: FormlyFieldMultiCheckbox,
          wrappers: ['form-field'],
        },
      ],
    }),
  ],
})
export class FormlyMatMultiCheckboxModule {
}
