import {Component} from '@angular/core';
import {MatSelectChange} from '@angular/material/select';
import {FieldType} from '@ngx-formly/material/form-field';

@Component({
  selector: 'formly-field-mat-select',
  template: `
    <ng-template #selectAll
                 let-selectOptions="selectOptions">
      <mat-option (click)="toggleSelectAll(selectOptions)">
        <mat-pseudo-checkbox class="mat-option-pseudo-checkbox"
                             [state]="getState(selectOptions)">
        </mat-pseudo-checkbox>
        {{ to.selectAllOption }}
      </mat-option>
    </ng-template>


    <mat-select [id]="id"
                [formControl]="formControl"
                [formlyAttributes]="field"
                [placeholder]="to.placeholder"
                [tabindex]="to.tabindex || 0"
                [compareWith]="to.compareWith || compareWith"
                [multiple]="to.multiple"
                (selectionChange)="change($event)"
                [errorStateMatcher]="errorStateMatcher"
                [aria-labelledby]="formField?._labelId"
                [disableOptionCentering]="to.disableOptionCentering"
    >
      <ng-container *ngIf="to.options | formlySelectOptions:field | async as selectOptions">
        <ng-container *ngIf="to.multiple && to.selectAllOption"
                      [ngTemplateOutlet]="selectAll"
                      [ngTemplateOutletContext]="{ selectOptions: selectOptions }">
        </ng-container>
        <ng-container *ngFor="let item of selectOptions">
          <mat-optgroup *ngIf="item.group"
                        [label]="item.label">
            <mat-option *ngFor="let child of item.group"
                        [value]="child.value"
                        [disabled]="child.disabled">
              {{ child.label }}
            </mat-option>
          </mat-optgroup>
          <mat-option *ngIf="!item.group"
                      [value]="item.value"
                      [disabled]="item.disabled">{{ item.label }}</mat-option>
        </ng-container>
      </ng-container>
    </mat-select>
  `,
})
export class FormlyFieldSelect extends FieldType {
  defaultOptions = {
    templateOptions: {options: []},
  };

  get value() {
    return this.formControl.value || [];
  }

  getState(options: any[]) {
    if (this.value.length > 0) {
      return this.value.length !== options.length
        ? 'indeterminate'
        : 'checked';
    }

    return '';
  }

  toggleSelectAll(options: any[]) {
    this.formControl.setValue(
      this.value.length !== options.length
        ? options.map(x => x.value)
        : [],
    );
  }

  change($event: MatSelectChange) {
    if (this.to.change) {
      this.to.change(this.field, $event);
    }
  }

  compareWith(o1: any, o2: any) {
    return o1 === o2;
  }
}
