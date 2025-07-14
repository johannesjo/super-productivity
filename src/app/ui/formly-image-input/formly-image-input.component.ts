import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/material';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DialogUnsplashPickerComponent } from '../dialog-unsplash-picker/dialog-unsplash-picker.component';

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
    const dialogRef = this._dialog.open(DialogUnsplashPickerComponent, {
      width: '900px',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe((selectedUrl: string | undefined) => {
      if (selectedUrl) {
        this.formControl.setValue(selectedUrl);
      }
    });
  }
}
