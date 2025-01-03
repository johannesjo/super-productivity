import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { MATERIAL_ICONS } from '../../../ui/material-icons.const';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { MatIcon } from '@angular/material/icon';
import { MatInput, MatSuffix } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';
import { IS_ELECTRON } from '../../../app.constants';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'icon-input',
  templateUrl: './icon-input.component.html',
  styleUrls: ['./icon-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIcon,
    MatInput,
    FormsModule,
    MatAutocompleteTrigger,
    FormlyModule,
    MatAutocomplete,
    MatOption,
    MatSuffix,
    MatTooltip,
  ],
})
export class IconInputComponent extends FieldType<FormlyFieldConfig> {
  filteredIcons: string[] = [];
  protected readonly IS_ELECTRON = IS_ELECTRON;
  isLinux = IS_ELECTRON && window.ea.isLinux();

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

    const isEmoji = /\p{Emoji}/u.test(val);
    if (isEmoji) {
      this.formControl.setValue(val);
    } else if (!val) {
      this.formControl.setValue('');
    }
  }

  onIconSelect(icon: string): void {
    this.formControl.setValue(icon);
  }

  openEmojiPicker(): void {
    if (IS_ELECTRON) {
      window.ea.showEmojiPanel();
    }
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
