import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { stringToMs } from '../string-to-ms.pipe';

@Component({
  selector: 'input-duration-formly',
  templateUrl: './input-duration-formly.component.html',
  styleUrls: ['./input-duration-formly.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputDurationFormlyComponent extends FieldType<FormlyFieldConfig> {
  // @ViewChild(MatInput, {static: true}) formFieldControl?: MatInput;
  onInputValueChange(ev: Event): void {
    const val = (ev.target as HTMLInputElement).value;
    this.formControl.setValue(val ? stringToMs(val) : null);
  }

  onKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') {
      const val = (ev.target as HTMLInputElement).value;
      this.formControl.setValue(val ? stringToMs(val) : null);
    }
  }
}
