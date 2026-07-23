import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { KeyboardConfig } from '@sp/keyboard-config';
import { T } from '../../../t.const';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { KEYBOARD_SETTINGS_FORM_CFG } from '../../../features/config/form-cfgs/keyboard-form.const';

interface ShortcutRow {
  heading?: string;
  label?: string;
  combo?: string;
}

@Component({
  selector: 'dialog-keyboard-shortcuts',
  templateUrl: './dialog-keyboard-shortcuts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    TranslatePipe,
  ],
})
export class DialogKeyboardShortcutsComponent {
  private _configService = inject(GlobalConfigService);

  T: typeof T = T;

  // Reuses the settings form config as the single source of labels and grouping,
  // so a new shortcut shows up here without touching this component.
  readonly rows = computed<ShortcutRow[]>(() => {
    const keyboard = this._configService.cfg()?.keyboard;
    if (!keyboard) {
      return [];
    }

    const rows: ShortcutRow[] = [];
    for (const item of KEYBOARD_SETTINGS_FORM_CFG.items ?? []) {
      if (item.type === 'tpl') {
        rows.push({ heading: item.templateOptions?.['text'] as string | undefined });
      } else if (item.key) {
        const combo = keyboard[item.key as keyof KeyboardConfig];
        if (combo) {
          rows.push({ label: item.templateOptions?.label, combo });
        }
      }
    }

    // Drop a heading when every shortcut below it is unbound.
    return rows.filter((row, i) => !row.heading || !!rows[i + 1]?.combo);
  });
}
