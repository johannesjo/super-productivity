import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect, MatSelectTrigger } from '@angular/material/select';
import { FormlyModule } from '@ngx-formly/core';
import { FormlyFieldSelect } from '@ngx-formly/material/select';

export interface IconSelectOption {
  value: unknown;
  label: string;
  icon?: string;
}

/**
 * A formly `select` whose options can carry a leading icon, shown in the list
 * and in the closed field. Options must be a plain array (no groups or
 * observables). Icons go through `fontIcon`, so their names stay out of the
 * option text that mat-select uses for the trigger and typeahead.
 */
@Component({
  selector: 'formly-icon-select',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormlyModule,
    MatSelect,
    MatSelectTrigger,
    MatOption,
    MatIcon,
  ],
  template: `
    <mat-select
      [id]="id"
      [formControl]="formControl"
      [formlyAttributes]="field"
      [placeholder]="props.placeholder"
      [tabIndex]="props.tabindex"
      [required]="required"
      [compareWith]="props.compareWith"
      (selectionChange)="change($event)"
      [errorStateMatcher]="errorStateMatcher"
      [aria-label]="_getAriaLabel()"
      [aria-labelledby]="_getAriaLabelledby()"
    >
      <mat-select-trigger>
        @for (item of iconOptions; track $index) {
          @if (item.value === formControl.value) {
            <span class="trigger">
              @if (item.icon) {
                <mat-icon [fontIcon]="item.icon"></mat-icon>
              }
              <span>{{ item.label }}</span>
            </span>
          }
        }
      </mat-select-trigger>
      @for (item of iconOptions; track $index) {
        <mat-option [value]="item.value">
          @if (item.icon) {
            <mat-icon [fontIcon]="item.icon"></mat-icon>
          }
          {{ item.label }}
        </mat-option>
      }
    </mat-select>
  `,
  styles: `
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: var(--s);
      vertical-align: middle;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormlyIconSelectComponent extends FormlyFieldSelect {
  get iconOptions(): IconSelectOption[] {
    return Array.isArray(this.props.options)
      ? (this.props.options as IconSelectOption[])
      : [];
  }
}
