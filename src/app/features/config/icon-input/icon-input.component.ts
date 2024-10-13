import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { MATERIAL_ICONS } from '../../../ui/material-icons.const';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { EmojiSearch } from '@ctrl/ngx-emoji-mart';

@Component({
  selector: 'icon-input',
  templateUrl: './icon-input.component.html',
  styleUrls: ['./icon-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconInputComponent extends FieldType<FormlyFieldConfig> {
  filteredIcons: string[] = [];
  filteredEmojis: string[] = [];
  i18n = {
    skintones: {
      1: 'Default Skin Tone',
      2: 'Light Skin Tone',
      3: 'Medium-Light Skin Tone',
      4: 'Medium Skin Tone',
      5: 'Medium-Dark Skin Tone',
      6: 'Dark Skin Tone',
    },
  };
  chosenSkin = Number(localStorage.getItem('emoji-mart.skin')) || 1;

  get type(): string {
    return this.to.type || 'text';
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }

  onInputValueChange(val: string): void {
    const iconsResult = MATERIAL_ICONS.filter(
      (icoStr) => icoStr && icoStr.toLowerCase().includes(val.toLowerCase()),
    );
    iconsResult.length = Math.min(150, iconsResult.length);
    this.filteredIcons = iconsResult;
    this.filteredEmojis =
      this.emojiSearch
        .search(val, undefined, 15)
        ?.map(({ id }) => `emoji:${id}:${this.chosenSkin}`) || [];

    if (!val) {
      this.formControl.setValue('');
    }
  }

  onIconSelect(icon: string): void {
    this.formControl.setValue(icon);
  }

  isEmoji(): boolean {
    return Boolean(this.formControl.value?.startsWith('emoji:'));
  }

  changeSkin(newSkin: number): void {
    this.chosenSkin = newSkin;
    if (!this.isEmoji()) {
      return;
    }

    const currentEmoji = this.formControl.value as string;
    if (currentEmoji.lastIndexOf(':') === currentEmoji.indexOf(':')) {
      this.formControl.setValue(`${currentEmoji}:${newSkin}`);
    } else {
      this.formControl.setValue(
        currentEmoji.substring(0, currentEmoji.lastIndexOf(':')) + `:${newSkin}`,
      );
    }
  }

  constructor(private emojiSearch: EmojiSearch) {
    super();
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
