import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormlyModule} from '@ngx-formly/core';
import {ReactiveFormsModule} from '@angular/forms';
import {MatSliderModule} from '@angular/material/slider';
import {FormlyMatFormFieldModule} from '@ngx-formly/material/form-field';

import {FormlySliderTypeComponent} from './slider.type';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [FormlySliderTypeComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSliderModule,
    TranslateModule,
    FormlyMatFormFieldModule,
    FormlyModule.forChild({
      types: [{
        name: 'slider',
        component: FormlySliderTypeComponent,
        wrappers: ['form-field'],
      }],
    }),
  ],
})
export class FormlyMatSliderModule {
}
