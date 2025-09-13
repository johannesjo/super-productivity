import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';

import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { ProjectFolderService } from '../../features/project-folder/project-folder.service';
import { DialogCreateEditProjectFolderComponent } from '../../features/project-folder/dialogs/create-edit-project-folder/dialog-create-edit-project-folder.component';
import { MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'folder-context-menu',
  templateUrl: './folder-context-menu.component.html',
  styleUrls: ['./folder-context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatMenuItem, MatIcon],
  standalone: true,
})
export class FolderContextMenuComponent {
  private readonly _matDialog = inject(MatDialog);
  private readonly _projectFolderService = inject(ProjectFolderService);
  private readonly _router = inject(Router);

  @Input() folderId!: string;

  async editFolder(): Promise<void> {
    const folder = await this._projectFolderService
      .getFolderById(this.folderId)
      .pipe(first())
      .toPromise();

    if (!folder) return;

    this._matDialog.open(DialogCreateEditProjectFolderComponent, {
      restoreFocus: true,
      data: {
        folder,
      },
    });
  }

  async deleteFolder(): Promise<void> {
    const folder = await this._projectFolderService
      .getFolderById(this.folderId)
      .pipe(first())
      .toPromise();

    if (!folder) return;

    const isConfirmed = await this._matDialog
      .open(DialogConfirmComponent, {
        restoreFocus: true,
        data: {
          message: `Are you sure you want to delete the folder "${folder.title}"? All projects in this folder will be moved to the root level.`,
        },
      })
      .afterClosed()
      .toPromise();

    if (isConfirmed) {
      this._projectFolderService.deleteProjectFolder(this.folderId);
    }
  }
}
