import {NgModule} from '@angular/core';

import {FormlyMatFormFieldModule} from '../../form-field';
import {FormlyMatInputModule} from '../../input';
import {FormlyMatTextAreaModule} from '../../textarea';
import {FormlyMatRadioModule} from '../../radio';
import {FormlyMatCheckboxModule} from '../../checkbox';
import {FormlyMatMultiCheckboxModule} from '../../multicheckbox';
import {FormlyMatSelectModule} from '../../select';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  imports: [
    FormlyMatFormFieldModule,
    FormlyMatInputModule,
    FormlyMatTextAreaModule,
    FormlyMatRadioModule,
    FormlyMatCheckboxModule,
    FormlyMatMultiCheckboxModule,
    FormlyMatSelectModule,
    TranslateModule,
  ],
})
export class FormlyMaterialModule {
}
