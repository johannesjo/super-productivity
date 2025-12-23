import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { T } from '../../t.const';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { DEFAULT_TAG_COLOR } from '../../features/work-context/work-context.const';
import { ColorPickerDirective } from 'ngx-color-picker';
import { GlobalThemeService } from '../../core/theme/global-theme.service';

export interface CreateTagData {
  title?: string;
  color?: string;
}

@Component({
  selector: 'dialog-create-tag',
  standalone: true,
  templateUrl: './dialog-create-tag.component.html',
  styleUrls: ['./dialog-create-tag.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogContent,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    MatDialogActions,
    MatButton,
    MatIcon,
    TranslatePipe,
    ColorPickerDirective,
  ],
})
export class DialogCreateTagComponent {
  private _matDialogRef = inject<MatDialogRef<DialogCreateTagComponent>>(MatDialogRef);

  // 🔑 LAZY injection – Store is NOT resolved unless accessed
  private readonly _globalThemeService = inject(GlobalThemeService, {
    optional: true,
  });

  get globalThemeService(): GlobalThemeService | null {
    return this._globalThemeService ?? null;
  }

  data = inject(MAT_DIALOG_DATA);

  T: typeof T = T;
  title: string = '';
  color: string = DEFAULT_TAG_COLOR;

  close(isSave: boolean): void {
    if (isSave && this.title.trim()) {
      this._matDialogRef.close({
        title: this.title.trim(),
        color: this.color,
      } as CreateTagData);
    } else {
      this._matDialogRef.close(undefined);
    }
  }
}
