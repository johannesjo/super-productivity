import {ChangeDetectionStrategy, Component, OnDestroy} from '@angular/core';
import {ProjectService} from '../../features/project/project.service';
import {T} from '../../t.const';
import {DialogCreateProjectComponent} from '../../features/project/dialogs/create-project/dialog-create-project.component';
import {Project} from '../../features/project/project.model';
import {MatDialog} from '@angular/material';
import {THEME_COLOR_MAP} from '../../app.constants';
import {Router} from '@angular/router';
import {DragulaService} from 'ng2-dragula';
import {Subscription} from 'rxjs';

@Component({
  selector: 'side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideNavComponent implements OnDestroy {
  T = T;
  private _subs = new Subscription();

  constructor(
    public readonly projectService: ProjectService,
    private readonly _matDialog: MatDialog,
    private readonly _router: Router,
    private readonly _dragulaService: DragulaService,
  ) {
    this._subs.add(this._dragulaService.dropModel('PROJECTS')
      .subscribe((params: any) => {
        const {target, source, targetModel, item} = params;
        const targetNewIds = targetModel.map((project) => project.id);
        this.projectService.updateOrder(targetNewIds);
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
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
