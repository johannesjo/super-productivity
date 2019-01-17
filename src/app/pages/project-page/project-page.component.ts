import { Component, OnInit } from '@angular/core';
import { ProjectService } from '../../features/project/project.service';
import { MatDialog } from '@angular/material';
import { DialogCreateProjectComponent } from '../../features/project/dialogs/create-project/dialog-create-project.component';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';

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
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
    });
  }

  ngOnInit() {
  }

  edit(project) {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
      data: Object.assign({}, project),
    });
  }

  remove(projectId) {
    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        okTxt: 'Delete',
        cancelTxt: 'Cancel',
        message: `Are you sure you want to delete this project?`,
      }
    }).afterClosed()
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          this.projectService.remove(projectId);
        }
      });
  }
}
