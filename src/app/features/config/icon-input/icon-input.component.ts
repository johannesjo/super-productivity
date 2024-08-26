import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { MATERIAL_ICONS } from '../../../ui/material-icons.const';
import { FormlyFieldConfig } from '@ngx-formly/core';

@Component({
  selector: 'icon-input',
  templateUrl: './icon-input.component.html',
  styleUrls: ['./icon-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconInputComponent extends FieldType<FormlyFieldConfig> {
  filteredIcons: string[] = [];

  get type(): string {
    return this.to.type || 'text';
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }

  onInputValueChange(val: string): void {
    const arr = MATERIAL_ICONS.filter(
      (icoStr) => icoStr && icoStr.toLowerCase().includes(val.toLowerCase()),
    );
    arr.length = Math.min(150, arr.length);
    this.filteredIcons = arr;

    if (!val) {
      this.formControl.setValue('');
    }
  }

  onIconSelect(icon: string): void {
    this.formControl.setValue(icon);
  }

  // onKeyDown(ev: KeyboardEvent): void {
  //   if (ev.key === 'Enter') {
  //     const ico = (ev as any)?.target?.value;
  //     if (this.filteredIcons.includes(ico)) {
  //       this.onIconSelect(ico);
  //     }
  //   }
  // }
}
