import {Component, OnInit, ViewChild} from '@angular/core';
import {MatInput} from '@angular/material/input';
import {FieldType} from '@ngx-formly/material/form-field';

@Component({
  selector: 'formly-field-mat-textarea',
  template: `
    <textarea matInput
              [id]="id"
              [readonly]="to.readonly"
              [formControl]="formControl"
              [errorStateMatcher]="errorStateMatcher"
              [cols]="to.cols"
              [rows]="to.rows"
              [formlyAttributes]="field"
              [placeholder]="to.placeholder|translate"
              [tabindex]="to.tabindex || 0"
              [readonly]="to.readonly">
    </textarea>
  `,
})
export class FormlyFieldTextArea extends FieldType implements OnInit {
  @ViewChild(MatInput, {static: true}) formFieldControl!: MatInput;
  defaultOptions = {
    templateOptions: {
      cols: 1,
      rows: 1,
    },
  };
}
