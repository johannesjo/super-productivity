import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FieldWrapper, FormlyFieldConfig } from '@ngx-formly/core';
import { expandAnimation } from '../animations/expand.ani';

@Component({
  selector: 'formly-collapsible',
  templateUrl: './formly-collapsible.component.html',
  styleUrl: './formly-collapsible.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.isExpanded]': 'isExpanded()',
  },
  standalone: false,
})
export class FormlyCollapsibleComponent extends FieldWrapper {
  isExpanded = signal(false);

  toggle(): void {
    this.isExpanded.set(!this.isExpanded());
  }

  isValid(field: FormlyFieldConfig): boolean {
    if (field.key) {
      return !!field.formControl?.valid;
    }

    return field.fieldGroup ? field.fieldGroup.every((f) => this.isValid(f)) : true;
  }
}
