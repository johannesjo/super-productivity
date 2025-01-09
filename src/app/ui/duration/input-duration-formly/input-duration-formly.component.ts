import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { stringToMs } from '../string-to-ms.pipe';
import { InputDurationDirective } from '../input-duration.directive';
import { MatInput } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'input-duration-formly',
  templateUrl: './input-duration-formly.component.html',
  styleUrls: ['./input-duration-formly.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    InputDurationDirective,
    MatInput,
    FormsModule,
    FormlyModule,
    ReactiveFormsModule,
  ],
})
export class InputDurationFormlyComponent extends FieldType<FormlyFieldConfig> {
  readonly input = viewChild.required('inputEl', { read: ElementRef });

  // @ViewChild(MatInput, {static: true}) formFieldControl?: MatInput;
  onInputValueChange(ev: Event): void {
    const val = (ev.target as HTMLInputElement).value;
    console.log('onInputValueChange', val);
    // this.formControl.setValue(val);
    this._updateValue(val);
  }

  onKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') {
      const val = (ev.target as HTMLInputElement).value;
      this._updateValue(val);
    }
  }

  private _updateValue(val: string): void {
    this.formControl.setValue(val ? stringToMs(val) : null);
    this.input().nativeElement.value = val;
    setTimeout(() => {
      const input = this.input();
      if (input.nativeElement.value !== val) {
        input.nativeElement.value = val;
      }
    });
  }
}
