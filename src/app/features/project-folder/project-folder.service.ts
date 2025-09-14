import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { ProjectFolder } from './project-folder.model';
import * as ProjectFolderActions from './store/project-folder.actions';
import * as ProjectFolderSelectors from './store/project-folder.selectors';
import { ProjectService } from '../project/project.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectFolderService {
  private readonly _store = inject(Store);
  private readonly _projectService = inject(ProjectService);

  projectFolders$ = this._store.pipe(
    select(ProjectFolderSelectors.selectAllProjectFolders),
  );
  topLevelFolders$ = this._store.pipe(
    select(ProjectFolderSelectors.selectTopLevelFolders),
  );

  constructor() {
    // Project folders are loaded via loadAllData action during app initialization
    // No need to manually load them here
  }

  addProjectFolder(folderData: Omit<ProjectFolder, 'id' | 'created'>): void {
    // Prevent nesting deeper than one level
    if (folderData.parentId) {
      // Check if the parent already has a parent (would create 2+ levels)
      this.getFolderById(folderData.parentId)
        .pipe(take(1))
        .subscribe((parentFolder: ProjectFolder | undefined) => {
          if (parentFolder?.parentId) {
            console.warn('Cannot create folder: nesting is limited to one level');
            return;
          }

          this._createFolder(folderData);
        });
    } else {
      this._createFolder(folderData);
    }
  }

  private _createFolder(folderData: Omit<ProjectFolder, 'id' | 'created'>): void {
    const newFolder: ProjectFolder = {
      id: nanoid(),
      created: Date.now(),
      updated: Date.now(),
      isExpanded: true,
      ...folderData,
    };

    this._store.dispatch(
      ProjectFolderActions.addProjectFolder({ projectFolder: newFolder }),
    );
  }

  updateProjectFolder(id: string, changes: Partial<ProjectFolder>): void {
    // Prevent nesting deeper than one level when updating parent
    if (changes.parentId) {
      this.getFolderById(changes.parentId)
        .pipe(take(1))
        .subscribe((parentFolder: ProjectFolder | undefined) => {
          if (parentFolder?.parentId) {
            console.warn('Cannot update folder: nesting is limited to one level');
            return;
          }

          this._updateFolder(id, changes);
        });
    } else {
      this._updateFolder(id, changes);
    }
  }

  private _updateFolder(id: string, changes: Partial<ProjectFolder>): void {
    const updatedChanges = {
      ...changes,
      updated: Date.now(),
    };

    this._store.dispatch(
      ProjectFolderActions.updateProjectFolder({ id, changes: updatedChanges }),
    );
  }

  deleteProjectFolder(id: string): void {
    // First move any projects in this folder to the root
    this._projectService.moveProjectsFromFolderToRoot(id);

    // Then delete the folder
    this._store.dispatch(ProjectFolderActions.deleteProjectFolder({ id }));
  }

  toggleFolderExpansion(id: string): void {
    this._store.dispatch(ProjectFolderActions.toggleFolderExpansion({ id }));
  }

  updateOrder(ids: string[]): void {
    this._store.dispatch(ProjectFolderActions.updateProjectFolderOrder({ ids }));
  }

  getFoldersByParentId(parentId: string | null): Observable<ProjectFolder[]> {
    return this._store.pipe(
      select(ProjectFolderSelectors.selectFoldersByParentId, { parentId }),
    );
  }

  getFolderById(id: string): Observable<ProjectFolder | undefined> {
    return this._store.pipe(
      select(ProjectFolderSelectors.selectProjectFolderById, { id }),
    );
  }
}
