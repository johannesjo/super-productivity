import { Component } from '@angular/core';
import { Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { MAT_DIALOG_DATA } from '@angular/material';
import { Project } from '../../project';

@Component({
  selector: 'dialog-create-project',
  templateUrl: './dialog-create-project.component.html',
  styleUrls: ['./dialog-create-project.component.scss'],
})
export class DialogCreateProjectComponent {
  constructor(
    private _matDialogRef: MatDialogRef<DialogCreateProjectComponent>,
    @Inject(MAT_DIALOG_DATA) public project: Project
  ) {
  }

  close() {
    this._matDialogRef.close();
  }
}
