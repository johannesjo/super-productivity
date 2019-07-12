import {Component, ViewChild} from '@angular/core';
import {FieldType} from '../../form-field';
import {MatSlideToggle} from '@angular/material/slide-toggle';

@Component({
  selector: 'formly-field-mat-toggle',
  template: `
    <mat-slide-toggle
      [id]="id"
      [formControl]="formControl"
      [formlyAttributes]="field"
      [tabindex]="to.tabindex || 0">
      {{ to.label|translate }}
    </mat-slide-toggle>
  `,
})
export class FormlyToggleTypeComponent extends FieldType {
  @ViewChild(MatSlideToggle, {static: true}) slideToggle!: MatSlideToggle;
  defaultOptions = {
    templateOptions: {
      hideFieldUnderline: true,
      floatLabel: 'always',
      hideLabel: true,
    },
  };

  onContainerClick(event: MouseEvent): void {
    this.slideToggle.focus();
    super.onContainerClick(event);
  }
}
