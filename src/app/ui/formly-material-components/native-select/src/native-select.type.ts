import {Component, ViewChild} from '@angular/core';
import {FieldType} from '../../form-field';
import {MatInput} from '@angular/material/input';

@Component({
  selector: 'formly-field-mat-native-select',
  template: `
    <select matNativeControl
            [id]="id"
            [readonly]="to.readonly"
            [errorStateMatcher]="errorStateMatcher"
            [formControl]="formControl"
            [formlyAttributes]="field">
      <option *ngIf="to.placeholder"
              [ngValue]="null">{{ to.placeholder }}</option>
      <ng-container *ngFor="let item of to.options | formlySelectOptions:field | async">
        <optgroup *ngIf="item.group"
                  label="{{item.label|translate}}">
          <option *ngFor="let child of item.group"
                  [ngValue]="child.value"
                  [disabled]="child.disabled">
            {{ child.label|translate }}
          </option>
        </optgroup>
        <option *ngIf="!item.group"
                [ngValue]="item.value"
                [disabled]="item.disabled">{{ item.label|translate }}</option>
      </ng-container>
    </select>
  `,
})
export class FormlyFieldNativeSelect extends FieldType {
  @ViewChild(MatInput, {static: true}) formFieldControl!: MatInput;
  defaultOptions = {
    templateOptions: {
      options: [],
    },
  };
}
