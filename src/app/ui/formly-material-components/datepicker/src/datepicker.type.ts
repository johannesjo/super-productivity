import {AfterViewInit, Component, TemplateRef, ViewChild} from '@angular/core';
import {ɵdefineHiddenProp as defineHiddenProp} from '@ngx-formly/core';
import {FieldType} from '../../form-field';
import {MatInput} from '@angular/material/input';
import {MatDatepickerInput} from '@angular/material/datepicker';

@Component({
  selector: 'formly-field-mat-datepicker',
  template: `
    <input matInput
           [id]="id"
           [errorStateMatcher]="errorStateMatcher"
           [formControl]="formControl"
           [matDatepicker]="picker"
           [matDatepickerFilter]="to.datepickerOptions.filter"
           [max]="to.datepickerOptions.max"
           [min]="to.datepickerOptions.min"
           [formlyAttributes]="field"
           [placeholder]="to.placeholder"
           [tabindex]="to.tabindex || 0"
           [readonly]="to.readonly">
    <ng-template #datepickerToggle>
      <mat-datepicker-toggle [for]="picker"></mat-datepicker-toggle>
    </ng-template>
    <mat-datepicker #picker
                    [color]="to.color"
                    [touchUi]="to.datepickerOptions.touchUi"
                    [startView]="to.datepickerOptions.startView"
                    [startAt]="to.datepickerOptions.startAt">
    </mat-datepicker>
  `,
})
export class FormlyDatepickerTypeComponent extends FieldType implements AfterViewInit {
  @ViewChild(MatInput, {static: true}) formFieldControl!: MatInput;
  @ViewChild(MatDatepickerInput, {static: true}) datepickerInput!: MatDatepickerInput<any>;
  @ViewChild('datepickerToggle', {static: true}) datepickerToggle!: TemplateRef<any>;

  defaultOptions = {
    templateOptions: {
      datepickerOptions: {
        startView: 'month',
        datepickerTogglePosition: 'suffix',
      },
    },
  };

  ngAfterViewInit() {
    super.ngAfterViewInit();
    // temporary fix for https://github.com/angular/material2/issues/6728
    (<any>this.datepickerInput)._formField = this.formField;

    setTimeout(() => {
      defineHiddenProp(this.field, '_mat' + this.to.datepickerOptions.datepickerTogglePosition, this.datepickerToggle);
    });
  }
}
