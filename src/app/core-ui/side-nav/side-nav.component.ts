import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ProjectService} from '../../features/project/project.service';
import {T} from '../../t.const';
import {DialogCreateProjectComponent} from '../../features/project/dialogs/create-project/dialog-create-project.component';
import {Project} from '../../features/project/project.model';
import {MatDialog} from '@angular/material';
import {THEME_COLOR_MAP} from '../../app.constants';
import {Router} from '@angular/router';

@Component({
  selector: 'side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideNavComponent {
  T = T;

  constructor(
    public readonly projectService: ProjectService,
    private readonly _matDialog: MatDialog,
    private readonly _router: Router,
  ) {
  }

  switchProject(projectId, routeToGoAfter?: string) {
    this.projectService.setCurrentId(projectId);
    if (routeToGoAfter) {
      this._router.navigate([routeToGoAfter]);
    }
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
