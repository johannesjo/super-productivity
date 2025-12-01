import { Component, EventEmitter, Output, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog'; // Import MatDialogModule
import { T } from '../../t.const';
import { TranslatePipe } from '@ngx-translate/core';
import { Log } from '../../core/log';

@Component({
  selector: 'dialog-import-from-url',
  templateUrl: './dialog-import-from-url.component.html',
  styleUrls: ['./dialog-import-from-url.component.scss'],
  standalone: true, // Mark as standalone
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule, // Ensure MatDialogModule is imported here for standalone
    // CommonModule will be automatically available for standalone components for ngIf, ngFor, etc.
    TranslatePipe, // If you use it in the template, import it
  ],
})
export class DialogImportFromUrlComponent {
  @Output() urlEntered = new EventEmitter<string>();

  url: string = '';
  T = T; // For translations in template, if needed

  private _dialogRef = inject(MatDialogRef<DialogImportFromUrlComponent>);

  constructor() {}

  submit(): void {
    if (this.url && this.url.trim() !== '') {
      this.urlEntered.emit(this.url.trim());
      this._dialogRef.close(this.url.trim());
    } else {
      // Basic validation: show error or prevent closing if URL is empty
      // For now, we rely on the required attribute in HTML and button disable
      // Or handle with a snackbar if more sophisticated feedback is needed
      Log.err('URL is required.');
    }
  }

  cancel(): void {
    this._dialogRef.close();
  }
}
