import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

import { ProjectFolderSummary } from '../../store/project-folder.model';
import { ProjectFolderService } from '../../project-folder.service';
import { TranslateModule } from '@ngx-translate/core';
import { T } from '../../../../t.const';
import { map } from 'rxjs/operators';

export interface DialogCreateEditProjectFolderData {
  folder?: ProjectFolderSummary;
}

@Component({
  selector: 'dialog-create-edit-project-folder',
  templateUrl: './dialog-create-edit-project-folder.component.html',
  styleUrls: ['./dialog-create-edit-project-folder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    TranslateModule,
  ],
})
export class DialogCreateEditProjectFolderComponent {
  private readonly _dialogRef = inject(
    MatDialogRef<DialogCreateEditProjectFolderComponent>,
  );
  readonly data = inject<DialogCreateEditProjectFolderData | null>(MAT_DIALOG_DATA);
  private readonly _projectFolderService = inject(ProjectFolderService);
  private readonly _fb = inject(FormBuilder);

  readonly isEdit = !!this.data?.folder;
  readonly availableFolders$ = this._projectFolderService.projectFolders$.pipe(
    map((folders) => folders.filter((folder) => folder.id !== this.data?.folder?.id)),
  );

  form: FormGroup = this._fb.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    parentId: [null],
  });

  readonly T = T;

  constructor() {
    if (this.isEdit && this.data?.folder) {
      const folder = this.data.folder;
      this.form.patchValue({
        title: folder.title,
        parentId: folder.parentId,
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }

    const formValue = this.form.value;

    if (this.isEdit && this.data?.folder) {
      const folder = this.data.folder;
      this._projectFolderService.updateFolder(folder.id, {
        title: formValue.title,
        parentId: formValue.parentId ?? null,
      });
    } else {
      this._projectFolderService.addFolder(formValue.title, formValue.parentId ?? null);
    }

    this._dialogRef.close();
  }

  cancel(): void {
    this._dialogRef.close();
  }
}
