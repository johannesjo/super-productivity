import { ChangeDetectionStrategy, Component, Input, input } from '@angular/core';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { T } from 'src/app/t.const';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { TagService } from '../../features/tag/tag.service';
import { first } from 'rxjs/operators';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { Project } from '../../features/project/project.model';
import { UiModule } from '../../ui/ui.module';

import { ProjectService } from '../../features/project/project.service';

@Component({
  selector: 'work-context-menu',
  templateUrl: './work-context-menu.component.html',
  styleUrls: ['./work-context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiModule, RouterModule],
})
export class WorkContextMenuComponent {
  readonly project = input.required<Project>();
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() contextId!: string;
  T: typeof T = T;
  TODAY_TAG_ID: string = TODAY_TAG.id as string;
  isForProject: boolean = true;
  base: string = 'project';

  constructor(
    private _matDialog: MatDialog,
    private _tagService: TagService,
    private _projectService: ProjectService,
    private _workContextService: WorkContextService,
    private _router: Router,
  ) {}

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input('contextType') set contextTypeSet(v: WorkContextType) {
    this.isForProject = v === WorkContextType.PROJECT;
    this.base = this.isForProject ? 'project' : 'tag';
  }

  async deleteTag(): Promise<void> {
    const tag = await this._tagService
      .getTagById$(this.contextId)
      .pipe(first())
      .toPromise();
    const isConfirmed = await this._matDialog
      .open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          message: T.F.TAG.D_DELETE.CONFIRM_MSG,
          translateParams: { tagName: tag.title },
        },
      })
      .afterClosed()
      .toPromise();

    if (isConfirmed) {
      const activeId = this._workContextService.activeWorkContextId;
      if (activeId === this.contextId) {
        await this._router.navigateByUrl('/');
      }
      this._tagService.removeTag(this.contextId);
    }
  }

  async deleteProject(): Promise<void> {
    const project = await this._projectService.getByIdOnce$(this.contextId).toPromise();
    const isConfirmed = await this._matDialog
      .open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          message: T.F.PROJECT.D_DELETE.MSG,
          translateParams: { title: project.title },
        },
      })
      .afterClosed()
      .toPromise();

    if (isConfirmed) {
      const activeId = this._workContextService.activeWorkContextId;
      if (activeId === this.contextId) {
        await this._router.navigateByUrl('/');
      }
      this._projectService.remove(project);
    }
  }
}
