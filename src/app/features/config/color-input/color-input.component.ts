import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { FieldType, FormlyModule } from '@ngx-formly/core';
import { IS_FIREFOX } from '../../../util/is-firefox';
import { IS_MOBILE } from '../../../util/is-mobile';

/**
 * This component deliberately avoids Formly's field type abstractions for the
 * Material UI components because the form field wrapper implementation uses
 * a focus monitoring service that is counterproductive for certain native
 * color input controls.
 */
@Component({
  selector: 'color-input',
  templateUrl: './color-input.component.html',
  styleUrls: ['./color-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormlyModule, MatFormField, MatInput, MatLabel, ReactiveFormsModule],
})
export class ColorInputComponent extends FieldType {
  onFocus(event: FocusEvent): void {
    if (!IS_FIREFOX || IS_MOBILE) return;
    // Desktop Firefox oddly fires another focus event when the native color
    // input closes rather than a blur event, so determine whether a value
    // change has occurred and force a blur to have it persisted
    const input = event.target as HTMLInputElement;
    if (input.value !== this.formControl.value) {
      input.blur();
    }
  }
}
