import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {ProjectService} from '../../features/project/project.service';
import {MatDialog} from '@angular/material';
import {DialogCreateProjectComponent} from '../../features/project/dialogs/create-project/dialog-create-project.component';
import {DialogConfirmComponent} from '../../ui/dialog-confirm/dialog-confirm.component';
import {standardListAnimation} from '../../ui/animations/standard-list.ani';
import {Subscription} from 'rxjs';
import {DragulaService} from 'ng2-dragula';
import {Project} from '../../features/project/project.model';

@Component({
  selector: 'project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class ProjectPageComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  constructor(
    public readonly projectService: ProjectService,
    public readonly _matDialog: MatDialog,
    private readonly _dragulaService: DragulaService,
  ) {
  }

  openCreateDialog() {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
    });
  }

  ngOnInit() {
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

  edit(project) {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
      data: Object.assign({}, project),
    });
  }

  archive(projectId: string) {
    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        okTxt: 'Archive',
        cancelTxt: 'Cancel',
        message: `Are you sure you want to archive this project?
        Archived Projects will not be shown in the menu any more and you can't access any of their data without restoring them.
        It's recommended that you backup your data before you do this.`,
      }
    }).afterClosed()
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          this.projectService.archive(projectId);
        }
      });
  }

  unarchive(projectId: string) {
    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        okTxt: 'Unarchive',
        cancelTxt: 'Cancel',
        message: `Are you sure you want to unarchive this project?`,
      }
    }).afterClosed()
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          this.projectService.unarchive(projectId);
        }
      });
  }

  remove(projectId) {
    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        okTxt: 'Delete',
        cancelTxt: 'Cancel',
        message: `Are you sure you want to delete this project? It's recommended to backup your data before you do this.`,
      }
    }).afterClosed()
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          this.projectService.remove(projectId);
        }
      });
  }

  trackById(i: number, project: Project): string {
    return project.id;
  }
}
