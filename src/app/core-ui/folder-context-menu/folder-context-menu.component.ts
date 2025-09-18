import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs/operators';

import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { ProjectFolderService } from '../../features/project-folder/project-folder.service';
import { DialogCreateEditProjectFolderComponent } from '../../features/project-folder/dialogs/create-edit-project-folder/dialog-create-edit-project-folder.component';
import { MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { ProjectFolderSummary } from '../../features/project-folder/store/project-folder.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { T } from '../../t.const';

@Component({
  selector: 'folder-context-menu',
  templateUrl: './folder-context-menu.component.html',
  styleUrls: ['./folder-context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatMenuItem, MatIcon, TranslateModule],
  standalone: true,
})
export class FolderContextMenuComponent {
  private readonly _matDialog = inject(MatDialog);
  private readonly _projectFolderService = inject(ProjectFolderService);
  private readonly _translateService = inject(TranslateService);

  @Input() folderId!: string;

  readonly T = T;

  async editFolder(): Promise<void> {
    const folder = await this._loadFolder(this.folderId);

    if (!folder) return;

    this._matDialog.open(DialogCreateEditProjectFolderComponent, {
      restoreFocus: true,
      data: {
        folder,
      },
    });
  }

  async deleteFolder(): Promise<void> {
    const folder = await this._loadFolder(this.folderId);

    if (!folder) return;

    const message = this._translateService.instant(T.F.PROJECT_FOLDER.CONFIRM_DELETE, {
      title: folder.title,
    });

    const isConfirmed = await new Promise<boolean>((resolve) => {
      this._matDialog
        .open(DialogConfirmComponent, {
          restoreFocus: true,
          data: {
            message,
          },
        })
        .afterClosed()
        .pipe(take(1))
        .subscribe((result) => resolve(!!result));
    });

    if (isConfirmed) {
      this._projectFolderService.deleteFolder(this.folderId);
    }
  }

  private _loadFolder(folderId: string): Promise<ProjectFolderSummary | undefined> {
    return new Promise((resolve) => {
      this._projectFolderService
        .getFolderSummaryById(folderId)
        .pipe(take(1))
        .subscribe((folder) => resolve(folder));
    });
  }
}
