import {Component, ViewChild} from '@angular/core';
import {FieldType} from '@ngx-formly/material/form-field';
import {MatSlider} from '@angular/material/slider';

@Component({
  selector: 'formly-field-mat-slider',
  template: `
    <mat-slider
      [id]="id"
      [style.width]="'100%'"
      [formControl]="formControl"
      [formlyAttributes]="field"
      [tabindex]="to.tabindex || 0"
      [color]="to.color">
    </mat-slider>
  `,
})
export class FormlySliderTypeComponent extends FieldType {
  @ViewChild(MatSlider, {static: true}) slider!: MatSlider;
  defaultOptions = {
    templateOptions: {
      hideFieldUnderline: true,
      floatLabel: 'always',
    },
  };

  onContainerClick(event: MouseEvent): void {
    this.slider.focus();
    super.onContainerClick(event);
  }
}
