import {Component, ViewChild} from '@angular/core';
import {FieldType} from '@ngx-formly/material/form-field';
import {MatRadioGroup} from '@angular/material/radio';

@Component({
  selector: 'formly-field-mat-radio',
  template: `
    <mat-radio-group
      [formControl]="formControl"
      [formlyAttributes]="field"
      [tabindex]="to.tabindex || 0">
      <mat-radio-button *ngFor="let option of to.options | formlySelectOptions:field | async; let i = index;"
                        [id]="id + '_' + i"
                        [color]="to.color"
                        [labelPosition]="to.labelPosition"
                        [value]="option.value">
        {{ option.label|translate }}
      </mat-radio-button>
    </mat-radio-group>
  `,
})
export class FormlyFieldRadio extends FieldType {
  @ViewChild(MatRadioGroup, {static: true}) radioGroup!: MatRadioGroup;
  defaultOptions = {
    templateOptions: {
      hideFieldUnderline: true,
      floatLabel: 'always',
      options: [],
    },
  };

  onContainerClick(event: MouseEvent): void {
    if (this.radioGroup._radios.length && !this.radioGroup.selected) {
      this.radioGroup._radios.first.focus();
    }
    super.onContainerClick(event);
  }
}
