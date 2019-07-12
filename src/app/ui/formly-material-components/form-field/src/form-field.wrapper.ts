import {
  AfterContentChecked,
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  Renderer2,
  TemplateRef,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {FieldWrapper, FormlyFieldConfig, ɵdefineHiddenProp as defineHiddenProp} from '@ngx-formly/core';
import {MatFormField, MatFormFieldControl} from '@angular/material/form-field';
import {Subject} from 'rxjs';

import {FieldType} from './field.type';

interface MatFormlyFieldConfig extends FormlyFieldConfig {
  _matprefix: TemplateRef<any>;
  _matsuffix: TemplateRef<any>;
  __formField__: FormlyWrapperFormField;
  _componentFactory: any;
}

@Component({
  selector: 'formly-wrapper-mat-form-field',
  template: `
    <!-- fix https://github.com/angular/material2/pull/7083 by setting width to 100% -->
    <mat-form-field
      [hideRequiredMarker]="true"
      [floatLabel]="to.floatLabel"
      [appearance]="to.appearance"
      [color]="to.color"
      [style.width]="'100%'">
      <ng-container #fieldComponent></ng-container>
      <mat-label *ngIf="to.label && to.hideLabel !== true">
        {{ to.label|translate }}
        <span *ngIf="to.required && to.hideRequiredMarker !== true"
              class="mat-form-field-required-marker">*</span>
      </mat-label>

      <ng-container matPrefix>
        <ng-container *ngTemplateOutlet="to.prefix ? to.prefix : formlyField._matprefix"></ng-container>
      </ng-container>

      <ng-container matSuffix>
        <ng-container *ngTemplateOutlet="to.suffix ? to.suffix : formlyField._matsuffix"></ng-container>
      </ng-container>

      <!-- fix https://github.com/angular/material2/issues/7737 by setting id to null  -->
      <mat-error [id]="null">
        <formly-validation-message [field]="field"></formly-validation-message>
      </mat-error>
      <!-- fix https://github.com/angular/material2/issues/7737 by setting id to null  -->
      <mat-hint *ngIf="to.description"
                [id]="null">{{ to.description }}</mat-hint>
    </mat-form-field>
  `,
  providers: [{provide: MatFormFieldControl, useExisting: FormlyWrapperFormField}],
})
export class FormlyWrapperFormField extends FieldWrapper<MatFormlyFieldConfig> implements OnInit, OnDestroy, MatFormFieldControl<any>, AfterViewInit, AfterContentChecked {
  @ViewChild('fieldComponent', {read: ViewContainerRef, static: true}) fieldComponent!: ViewContainerRef;
  @ViewChild(MatFormField, {static: true}) formField!: MatFormField;

  stateChanges = new Subject<void>();
  private initialGapCalculated = false;

  constructor(private renderer: Renderer2) {
    super();
  }

  _errorState = false;

  get errorState() {
    const showError = this.options!.showError!(this);
    if (showError !== this._errorState) {
      this._errorState = showError;
      this.stateChanges.next();
    }

    return showError;
  }

  get controlType() {
    return this.to.type;
  }

  get focused() {
    return !!this.formlyField.focus && !this.disabled;
  }

  get disabled() {
    return !!this.to.disabled;
  }

  get required() {
    return !!this.to.required;
  }

  get placeholder() {
    return this.to.placeholder || '';
  }

  get shouldPlaceholderFloat() {
    return this.shouldLabelFloat;
  }

  get value() {
    return this.formControl.value;
  }

  get ngControl() {
    return this.formControl as any;
  }

  get empty() {
    return !this.formControl.value;
  }

  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  get formlyField() {
    return this.field as MatFormlyFieldConfig;
  }

  ngOnInit() {
    this.formField._control = this;
    defineHiddenProp(this.field, '__formField__', this.formField);

    const fieldComponent = this.formlyField['_componentFactory'];
    if (fieldComponent && !(fieldComponent.componentRef.instance instanceof FieldType)) {
      console.warn(`Component '${fieldComponent.component.prototype.constructor.name}' must extend 'FieldType' from '@ngx-formly/material'.`);
    }

    // fix for https://github.com/angular/material2/issues/11437
    if (this.formlyField.hide && this.formlyField.templateOptions!.appearance === 'outline') {
      this.initialGapCalculated = true;
    }
  }

  ngAfterContentChecked() {
    if (!this.initialGapCalculated || this.formlyField.hide) {
      return;
    }

    this.formField.updateOutlineGap();
    this.initialGapCalculated = true;
  }

  ngAfterViewInit() {
    // temporary fix for https://github.com/angular/material2/issues/7891
    if (this.formField.underlineRef && this.to.hideFieldUnderline === true) {
      this.renderer.removeClass(this.formField.underlineRef.nativeElement, 'mat-form-field-underline');
      this.renderer.removeClass(this.formField.underlineRef.nativeElement.firstChild, 'mat-form-field-ripple');
    }
  }

  ngOnDestroy() {
    delete this.formlyField.__formField__;
    this.stateChanges.complete();
  }

  setDescribedByIds(ids: string[]): void {
  }

  onContainerClick(event: MouseEvent): void {
    this.formlyField.focus = true;
    this.stateChanges.next();
  }
}
