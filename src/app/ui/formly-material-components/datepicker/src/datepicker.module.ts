import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormlyModule} from '@ngx-formly/core';
import {ReactiveFormsModule} from '@angular/forms';

import {FormlyMatFormFieldModule} from '@ngx-formly/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDatepickerModule} from '@angular/material/datepicker';

import {FormlyDatepickerTypeComponent} from './datepicker.type';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [FormlyDatepickerTypeComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatDatepickerModule,
    TranslateModule,

    FormlyMatFormFieldModule,
    FormlyModule.forChild({
      types: [{
        name: 'datepicker',
        component: FormlyDatepickerTypeComponent,
        wrappers: ['form-field'],
      }],
    }),
  ],
})
export class FormlyMatDatepickerModule {
}
