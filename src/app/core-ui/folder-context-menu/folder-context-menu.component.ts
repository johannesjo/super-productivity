import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs/operators';

import { DialogConfirmComponent } from '../../ui/dialog-confirm/dialog-confirm.component';
import { MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { T } from '../../t.const';
import { DialogPromptComponent } from '../../ui/dialog-prompt/dialog-prompt.component';
import { MenuTreeService } from '../../features/menu-tree/menu-tree.service';
import {
  MenuTreeFolderNode,
  MenuTreeKind,
} from '../../features/menu-tree/store/menu-tree.model';

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
  private readonly _translateService = inject(TranslateService);
  private readonly _menuTreeService = inject(MenuTreeService);

  @Input() folderId!: string;
  @Input() treeKind: MenuTreeKind = MenuTreeKind.PROJECT;

  readonly T = T;

  editFolder(): void {
    const folder = this._loadFolder(this.folderId);
    if (!folder) return;

    const folderNs =
      this.treeKind === MenuTreeKind.PROJECT ? T.F.PROJECT_FOLDER : T.F.TAG_FOLDER;

    const dialogRef = this._matDialog.open(DialogPromptComponent, {
      restoreFocus: true,
      data: {
        txtLabel: this._translateService.instant(folderNs.DIALOG.NAME_LABEL),
        txtValue: folder.name,
        placeholder: this._translateService.instant(folderNs.DIALOG.NAME_PLACEHOLDER),
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: string | null) => {
        const trimmed = result?.trim();
        if (!trimmed || trimmed === folder.name) {
          return;
        }
        // Extract folder ID (remove the "folder-" prefix if present)
        const cleanId = this.folderId.startsWith('folder-')
          ? this.folderId.substring(7)
          : this.folderId;

        if (this.treeKind === MenuTreeKind.PROJECT) {
          this._menuTreeService.updateFolderInProject(cleanId, trimmed);
        } else {
          this._menuTreeService.updateFolderInTag(cleanId, trimmed);
        }
      });
  }

  deleteFolder(): void {
    const folder = this._loadFolder(this.folderId);
    if (!folder) return;

    const confirmKey =
      this.treeKind === MenuTreeKind.PROJECT
        ? T.F.PROJECT_FOLDER.CONFIRM_DELETE
        : T.F.TAG_FOLDER.CONFIRM_DELETE;

    const message = this._translateService.instant(confirmKey, {
      title: folder.name,
    });

    const dialogRef = this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: { message },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: boolean) => {
        if (result) {
          // Extract folder ID (remove the "folder-" prefix if present)
          const cleanId = this.folderId.startsWith('folder-')
            ? this.folderId.substring(7)
            : this.folderId;

          if (this.treeKind === MenuTreeKind.PROJECT) {
            this._menuTreeService.deleteFolderFromProject(cleanId);
          } else {
            this._menuTreeService.deleteFolderFromTag(cleanId);
          }
        }
      });
  }

  private _loadFolder(folderId: string): MenuTreeFolderNode | null {
    // Extract folder ID (remove the "folder-" prefix if present)
    const cleanId = folderId.startsWith('folder-') ? folderId.substring(7) : folderId;

    const projectTree = this._menuTreeService.projectTree();
    const tagTree = this._menuTreeService.tagTree();

    // Search in the appropriate tree first, then fallback to the other
    const primaryTree = this.treeKind === MenuTreeKind.PROJECT ? projectTree : tagTree;
    const secondaryTree = this.treeKind === MenuTreeKind.PROJECT ? tagTree : projectTree;

    return (
      this._menuTreeService.findFolderInTree(cleanId, primaryTree) ||
      this._menuTreeService.findFolderInTree(cleanId, secondaryTree)
    );
  }
}
