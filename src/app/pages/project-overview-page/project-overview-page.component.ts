import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ProjectService } from '../../features/project/project.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogCreateProjectComponent } from '../../features/project/dialogs/create-project/dialog-create-project.component';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { Subscription } from 'rxjs';
import { DragulaService } from 'ng2-dragula';
import { Project } from '../../features/project/project.model';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { download } from '../../util/download';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { THEME_COLOR_MAP } from '../../app.constants';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { withLatestFrom } from 'rxjs/operators';
import { ExportedProject } from '../../features/project/project-archive.model';

@Component({
  selector: 'project-page',
  templateUrl: './project-overview-page.component.html',
  styleUrls: ['./project-overview-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class ProjectOverviewPageComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  private _subs: Subscription = new Subscription();

  constructor(
    public readonly projectService: ProjectService,
    public readonly workContextService: WorkContextService,
    public readonly _matDialog: MatDialog,
    private readonly _dragulaService: DragulaService,
    private readonly _snackService: SnackService,
    private readonly _persistenceService: PersistenceService,
  ) {
  }

  openCreateDialog() {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
    });
  }

  ngOnInit() {
    this._subs.add(this._dragulaService.dropModel('PROJECTS').pipe(
      withLatestFrom(this.projectService.archived$),
      ).subscribe(([params, archived]: any) => {
        const {targetModel} = params;
        const targetNewIds = targetModel.map((project: Project) => project.id);

        const archivedIds = archived
          ? archived.map((p: Project) => p.id)
          : [];
        this.projectService.updateOrder([...targetNewIds, ...archivedIds]);
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  async export(projectId: string, projectTitle: string) {
    const data: ExportedProject = await this._persistenceService.loadCompleteProject(projectId);
    console.log(data);
    const dataString = JSON.stringify(data);
    download(`${projectTitle}.json`, dataString);
  }

  handleFileInput(ev: any) {
    const files = ev.target.files;
    const file = files.item(0);
    const reader = new FileReader();
    reader.onload = () => {
      const textData = reader.result;
      console.log(textData);

      let project: ExportedProject;
      try {
        project = JSON.parse((textData as any).toString());
        this.projectService.importCompleteProject(project);
      } catch (e) {
        console.error(e);
        this._snackService.open({type: 'ERROR', msg: T.PP.S_INVALID_JSON});
      }
    };
    reader.readAsText(file);
  }

  edit(project: Project) {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
      data: Object.assign({}, project),
    });
  }

  archive(projectId: string) {
    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        okTxt: T.PP.D_CONFIRM_ARCHIVE.OK,
        message: T.PP.D_CONFIRM_ARCHIVE.MSG,
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
        okTxt: T.PP.D_CONFIRM_UNARCHIVE.OK,
        message: T.PP.D_CONFIRM_UNARCHIVE.MSG,
      }
    }).afterClosed()
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          this.projectService.unarchive(projectId);
        }
      });
  }

  remove(projectId: string) {
    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        okTxt: T.PP.D_CONFIRM_DELETE.OK,
        message: T.PP.D_CONFIRM_DELETE.MSG,
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

  getThemeColor(color: string): { [key: string]: string } {
    const standardColor = (THEME_COLOR_MAP as any)[color];
    const colorToUse = (standardColor)
      ? standardColor
      : color;
    return {background: colorToUse};
  }
}
