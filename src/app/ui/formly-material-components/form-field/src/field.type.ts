import {AfterViewInit, OnDestroy, OnInit, TemplateRef, Type, ViewChild} from '@angular/core';
import {FieldType as CoreFieldType, FormlyFieldConfig, ɵdefineHiddenProp as defineHiddenProp} from '@ngx-formly/core';
import {Subject} from 'rxjs';
import {MatFormField, MatFormFieldControl} from '@angular/material/form-field';
import {FormlyErrorStateMatcher} from './formly.error-state-matcher';

export abstract class FieldType<F extends FormlyFieldConfig = FormlyFieldConfig> extends CoreFieldType<F> implements OnInit, AfterViewInit, OnDestroy, MatFormFieldControl<any> {
  @ViewChild('matPrefix', {static: true}) matPrefix!: TemplateRef<any>;
  @ViewChild('matSuffix', {static: true}) matSuffix!: TemplateRef<any>;
  errorStateMatcher = new FormlyErrorStateMatcher(this);
  stateChanges = new Subject<void>();
  private _control!: MatFormFieldControl<any>;

  get formFieldControl() {
    return this._control || this;
  }

  set formFieldControl(control: MatFormFieldControl<any>) {
    this._control = control;
    if (this.formField && control !== this.formField._control) {
      this.formField._control = control;
    }
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
    if (this.to.type) {
      return this.to.type;
    }

    if ((<any>this.field.type) instanceof Type) {
      return this.field.type!.constructor.name;
    }

    return this.field.type!;
  }

  get focused() {
    return !!this.field.focus && !this.disabled;
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

  set value(value) {
    this.formControl.patchValue(value);
  }

  get ngControl() {
    return this.formControl as any;
  }

  get empty() {
    return this.value === undefined || this.value === null || this.value === '';
  }

  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  get formField(): MatFormField {
    return this.field ? (<any>this.field)['__formField__'] : null;
  }

  ngOnInit() {
    if (this.formField) {
      this.formField._control = this.formFieldControl;
    }
  }

  ngAfterViewInit() {
    if (this.matPrefix || this.matSuffix) {
      setTimeout(() => {
        defineHiddenProp(this.field, '_matprefix', this.matPrefix);
        defineHiddenProp(this.field, '_matsuffix', this.matSuffix);
        (<any>this.options)._markForCheck(this.field);
      });
    }
  }

  ngOnDestroy() {
    if (this.formField) {
      delete this.formField._control;
    }
    this.stateChanges.complete();
  }

  setDescribedByIds(ids: string[]): void {
  }

  onContainerClick(event: MouseEvent): void {
    this.field.focus = true;
    this.stateChanges.next();
  }
}
