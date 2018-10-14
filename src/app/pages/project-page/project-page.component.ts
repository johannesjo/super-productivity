import { Component, OnInit } from '@angular/core';
import { ProjectService } from '../../project/project.service';
import { MatDialog } from '@angular/material';
import { DialogCreateProjectComponent } from '../../project/dialogs/create-project/dialog-create-project.component';

@Component({
  selector: 'project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.scss']
})
export class ProjectPageComponent implements OnInit {
  constructor(public readonly projectService: ProjectService,
              public readonly _matDialog: MatDialog) {
  }

  openCreateDialog() {
    this._matDialog.open(DialogCreateProjectComponent, {});
  }

  ngOnInit() {
  }

  edit(project) {
    this._matDialog.open(DialogCreateProjectComponent, {
      data: Object.assign({}, project),
    });
  }

  remove(projectId) {
    this.projectService.remove(projectId);
  }
}
