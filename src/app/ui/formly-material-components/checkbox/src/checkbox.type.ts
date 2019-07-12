import {AfterViewInit, Component, OnDestroy, ViewChild} from '@angular/core';
import {FieldType} from '../../form-field';
import {MatCheckbox} from '@angular/material/checkbox';
import {FocusMonitor} from '@angular/cdk/a11y';

@Component({
  selector: 'formly-field-mat-checkbox',
  template: `
    <mat-checkbox
      [formControl]="formControl"
      [id]="id"
      [formlyAttributes]="field"
      [tabindex]="to.tabindex || 0"
      [indeterminate]="to.indeterminate && formControl.value === null"
      [color]="to.color"
      [labelPosition]="to.align || to.labelPosition">
      {{ to.label|translate }}
      <span *ngIf="to.required && to.hideRequiredMarker !== true"
            class="mat-form-field-required-marker">*</span>
    </mat-checkbox>
  `,
})
export class FormlyFieldCheckbox extends FieldType implements AfterViewInit, OnDestroy {
  @ViewChild(MatCheckbox, {static: true}) checkbox!: MatCheckbox;
  defaultOptions = {
    templateOptions: {
      hideFieldUnderline: true,
      indeterminate: true,
      floatLabel: 'always',
      hideLabel: true,
      align: 'start', // start or end
    },
  };

  constructor(private focusMonitor: FocusMonitor) {
    super();
  }

  onContainerClick(event: MouseEvent): void {
    this.checkbox.focus();
    super.onContainerClick(event);
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    this.focusMonitor
      .monitor(this.checkbox._inputElement.nativeElement)
      .subscribe(focusOrigin => this.field.focus = !!focusOrigin);
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.focusMonitor.stopMonitoring(this.checkbox._inputElement.nativeElement);
  }
}
