import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  DialogUnsplashPickerComponent,
  DialogUnsplashPickerData,
} from '../dialog-unsplash-picker/dialog-unsplash-picker.component';

@Component({
  selector: 'formly-image-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormlyModule,
    MatInput,
    MatButton,
    MatIcon,
  ],
  templateUrl: './formly-image-input.component.html',
  styleUrls: ['./formly-image-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormlyImageInputComponent extends FieldType<FormlyFieldConfig> {
  constructor(private _dialog: MatDialog) {
    super();
  }

  openUnsplashPicker(): void {
    const dialogData: DialogUnsplashPickerData = {
      context: this.field.key as string, // This will be 'backgroundImageDark' or 'backgroundImageLight'
    };

    const dialogRef = this._dialog.open(DialogUnsplashPickerComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Handle both string (legacy) and object (new) return formats
        const url = typeof result === 'string' ? result : result.url;
        if (url) {
          this.formControl.setValue(url);
          // TODO: Store attribution data if needed for compliance display
        }
      }
    });
  }
}
