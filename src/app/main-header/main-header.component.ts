import { Component, OnInit } from '@angular/core';
import { ProjectService } from '../project/project.service';
import { DialogCreateProjectComponent } from '../project/dialogs/create-project/dialog-create-project.component';
import { MatDialog } from '@angular/material';
import { LayoutService } from '../core/layout/layout.service';

@Component({
  selector: 'main-header',
  templateUrl: './main-header.component.html',
  styleUrls: ['./main-header.component.scss']
})
export class MainHeaderComponent implements OnInit {
  constructor(
    public readonly projectService: ProjectService,
    private readonly _matDialog: MatDialog,
    private readonly _layoutService: LayoutService,
  ) {
  }

  ngOnInit() {
  }

  switchProject(projectId) {
    this.projectService.setCurrentId(projectId);
  }

  addProject() {
    this._matDialog.open(DialogCreateProjectComponent);
  }

  showAddTaskBar() {
    this._layoutService.showAddTaskBar();
  }
}
