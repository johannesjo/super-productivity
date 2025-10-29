import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  Input,
} from '@angular/core';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { T } from 'src/app/t.const';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { TagService } from '../../features/tag/tag.service';
import { first } from 'rxjs/operators';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { Router, RouterLink, RouterModule } from '@angular/router';

import { ProjectService } from '../../features/project/project.service';
import { MatMenuItem } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { INBOX_PROJECT } from '../../features/project/project.const';
import { SnackService } from '../../core/snack/snack.service';
import { WorkContextMarkdownService } from '../../features/work-context/work-context-markdown.service';
import { ShareService, ShareSupport } from '../../core/share/share.service';

@Component({
  selector: 'work-context-menu',
  templateUrl: './work-context-menu.component.html',
  styleUrls: ['./work-context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterModule, MatMenuItem, TranslatePipe, MatIcon],
  standalone: true,
})
export class WorkContextMenuComponent implements OnInit {
  private _matDialog = inject(MatDialog);
  private _tagService = inject(TagService);
  private _projectService = inject(ProjectService);
  private _workContextService = inject(WorkContextService);
  private _router = inject(Router);
  private _snackService = inject(SnackService);
  private _markdownService = inject(WorkContextMarkdownService);
  private _shareService = inject(ShareService);
  private _cd = inject(ChangeDetectorRef);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() contextId!: string;
  T: typeof T = T;
  TODAY_TAG_ID: string = TODAY_TAG.id as string;
  isForProject: boolean = true;
  base: string = 'project';
  shareSupport: ShareSupport = 'none';

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input('contextType') set contextTypeSet(v: WorkContextType) {
    this.isForProject = v === WorkContextType.PROJECT;
    this.base = this.isForProject ? 'project' : 'tag';
  }

  async ngOnInit(): Promise<void> {
    const support = await this._shareService.getShareSupport();
    this._setShareSupport(support);
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

  protected readonly INBOX_PROJECT = INBOX_PROJECT;

  async shareTasksAsMarkdown(): Promise<void> {
    const { status, markdown, contextTitle } =
      await this._markdownService.getMarkdownForContext(
        this.contextId,
        this.isForProject,
      );

    if (status === 'empty' || !markdown) {
      this._snackService.open(T.GLOBAL_SNACK.NO_TASKS_TO_COPY);
      return;
    }

    const shareResult = await this._shareService.shareText({
      title: contextTitle ?? 'Super Productivity',
      text: markdown,
    });

    if (shareResult === 'shared') {
      if (this.shareSupport === 'none') {
        const support = await this._shareService.getShareSupport();
        this._setShareSupport(support);
      }
      return;
    }

    if (shareResult === 'cancelled') {
      return;
    }

    const didCopy = await this._markdownService.copyMarkdownText(markdown);
    if (didCopy) {
      if (shareResult === 'unavailable') {
        this._snackService.open(T.GLOBAL_SNACK.SHARE_UNAVAILABLE_FALLBACK);
        this._setShareSupport('none');
      } else if (shareResult === 'failed') {
        this._snackService.open(T.GLOBAL_SNACK.SHARE_FAILED_FALLBACK);
        this._setShareSupport('none');
      } else {
        this._snackService.open(T.GLOBAL_SNACK.COPY_TO_CLIPPBOARD);
      }
      return;
    }

    this._snackService.open({
      msg: T.GLOBAL_SNACK.SHARE_FAILED,
      type: 'ERROR',
    });
    this._setShareSupport('none');
  }

  private _setShareSupport(support: ShareSupport): void {
    this.shareSupport = support;
    this._cd.markForCheck();
  }
}
