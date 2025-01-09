import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FieldWrapper, FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { expandAnimation } from '../animations/expand.ani';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

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
  imports: [MatIcon, FormlyModule, TranslatePipe],
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
