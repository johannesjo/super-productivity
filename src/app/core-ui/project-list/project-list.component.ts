import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ProjectService} from '../../features/project/project.service';
import {T} from '../../t.const';
import {DialogCreateProjectComponent} from '../../features/project/dialogs/create-project/dialog-create-project.component';
import {Project} from '../../features/project/project.model';
import {MatDialog} from '@angular/material';
import {THEME_COLOR_MAP} from '../../app.constants';

@Component({
  selector: 'project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectListComponent implements OnInit {
  T = T;

  constructor(
    public readonly projectService: ProjectService,
    private readonly _matDialog: MatDialog,
  ) {
  }

  ngOnInit() {
  }

  switchProject(projectId) {
    this.projectService.setCurrentId(projectId);
  }

  addProject() {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
    });
  }

  trackById(i: number, project: Project) {
    return project.id;
  }

  getThemeColor(color: string): { [key: string]: string } {
    const standardColor = THEME_COLOR_MAP[color];
    const colorToUse = (standardColor)
      ? standardColor
      : color;
    return {background: colorToUse};
  }
}
