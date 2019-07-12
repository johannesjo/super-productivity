import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {FormlyModule} from '@ngx-formly/core';
import {FormlySelectModule} from '@ngx-formly/core/select';

import {FormlyMatFormFieldModule} from '../../form-field';
import {MatSelectModule} from '@angular/material/select';

import {FormlyFieldSelect} from './select.type';
import {MatPseudoCheckboxModule} from '@angular/material/core';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [FormlyFieldSelect],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatPseudoCheckboxModule,
    TranslateModule.forChild(),

    FormlyMatFormFieldModule,
    FormlySelectModule,
    FormlyModule.forChild({
      types: [{
        name: 'select',
        component: FormlyFieldSelect,
        wrappers: ['form-field'],
      }],
    }),
  ],
})
export class FormlyMatSelectModule {
}
