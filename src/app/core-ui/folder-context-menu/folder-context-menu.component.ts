import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs/operators';

import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { ProjectFolderService } from '../../features/project-folder/project-folder.service';
import { DialogCreateEditProjectFolderComponent } from '../../features/project-folder/dialogs/create-edit-project-folder/dialog-create-edit-project-folder.component';
import { MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { ProjectService } from '../../features/project/project.service';
import { ProjectFolder } from '../../features/project-folder/store/project-folder.model';

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
  private readonly _projectService = inject(ProjectService);

  @Input() folderId!: string;

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

    const isConfirmed = await new Promise<boolean>((resolve) => {
      this._matDialog
        .open(DialogConfirmComponent, {
          restoreFocus: true,
          data: {
            message: `Are you sure you want to delete the folder "${folder.title}"? All projects in this folder will be moved to the root level.`,
          },
        })
        .afterClosed()
        .pipe(take(1))
        .subscribe((result) => resolve(!!result));
    });

    if (isConfirmed) {
      this._projectService.moveProjectsFromFolderToRoot(this.folderId);
      this._projectFolderService.deleteProjectFolder(this.folderId);
    }
  }

  private _loadFolder(folderId: string): Promise<ProjectFolder | undefined> {
    return new Promise((resolve) => {
      this._projectFolderService
        .getFolderById(folderId)
        .pipe(take(1))
        .subscribe((folder) => resolve(folder));
    });
  }
}
