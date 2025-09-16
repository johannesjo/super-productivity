import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

import { ProjectFolder } from '../../store/project-folder.model';
import { ProjectFolderService } from '../../project-folder.service';

export interface DialogCreateEditProjectFolderData {
  folder?: ProjectFolder;
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
  readonly availableFolders$ = this._projectFolderService.topLevelFolders$;

  form: FormGroup = this._fb.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    parentId: [null],
  });

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
      this._projectFolderService.updateProjectFolder(folder.id, {
        title: formValue.title,
        parentId: formValue.parentId,
      });
    } else {
      this._projectFolderService.addProjectFolder({
        title: formValue.title,
        parentId: formValue.parentId,
        isExpanded: true,
      });
    }

    this._dialogRef.close();
  }

  cancel(): void {
    this._dialogRef.close();
  }
}
