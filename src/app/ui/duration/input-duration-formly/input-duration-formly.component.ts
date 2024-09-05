import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
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
  @ViewChild('inputEl', { static: true, read: ElementRef }) input!: ElementRef;

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
    this.input.nativeElement.value = val;
    setTimeout(() => {
      if (this.input.nativeElement.value !== val) {
        this.input.nativeElement.value = val;
      }
    });
  }
}
