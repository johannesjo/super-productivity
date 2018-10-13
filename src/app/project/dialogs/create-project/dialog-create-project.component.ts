import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { ProjectService } from '../../project.service';
import { Project } from '../../project';

@Component({
  selector: 'dialog-create-project',
  templateUrl: './dialog-create-project.component.html',
  styleUrls: ['./dialog-create-project.component.scss'],
})
export class DialogCreateProjectComponent {
  project: Project;

  constructor(public dialogRef: MatDialogRef<DialogCreateProjectComponent>,
              private _projectService: ProjectService) {
  }


  submit() {
    this.dialogRef.close({});
  }
}
