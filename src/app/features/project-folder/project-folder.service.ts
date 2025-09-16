import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map, take, withLatestFrom } from 'rxjs/operators';
import { ProjectFolder, ProjectFolderState } from './store/project-folder.model';
import { updateProjectFolders } from './store/project-folder.actions';
import { projectFolderFeatureKey } from './store/project-folder.reducer';
import { nanoid } from 'nanoid';

@Injectable({
  providedIn: 'root',
})
export class ProjectFolderService {
  private readonly _store = inject(Store);

  readonly projectFolders$: Observable<ProjectFolder[]> = this._store
    .select((state: any) => state[projectFolderFeatureKey] as ProjectFolderState)
    .pipe(map((state) => state.ids.map((id) => state.entities[id])));

  readonly rootProjectIds$: Observable<string[]> = this._store
    .select((state: any) => state[projectFolderFeatureKey] as ProjectFolderState)
    .pipe(map((state) => state.rootProjectIds));

  readonly topLevelFolders$: Observable<ProjectFolder[]> = this.projectFolders$.pipe(
    map((folders) => folders.filter((folder) => !folder.parentId)),
  );

  getFolderById(id: string): Observable<ProjectFolder | undefined> {
    return this.projectFolders$.pipe(
      map((folders) => folders.find((folder) => folder.id === id)),
    );
  }

  updateProjectFolder(id: string, changes: Partial<ProjectFolder>): void {
    this.projectFolders$
      .pipe(take(1), withLatestFrom(this.rootProjectIds$))
      .subscribe(([folders, rootProjectIds]) => {
        const updatedFolders = folders.map((folder) =>
          folder.id === id ? { ...folder, ...changes } : folder,
        );
        this._store.dispatch(
          updateProjectFolders({ projectFolders: updatedFolders, rootProjectIds }),
        );
      });
  }

  addProjectFolder(folder: Omit<ProjectFolder, 'id' | 'projectIds'>): void {
    this.projectFolders$
      .pipe(take(1), withLatestFrom(this.rootProjectIds$))
      .subscribe(([folders, rootProjectIds]) => {
        const newFolder: ProjectFolder = {
          ...folder,
          id: `folder-${nanoid()}`,
          projectIds: [],
        };
        const updatedFolders = [...folders, newFolder];
        this._store.dispatch(
          updateProjectFolders({ projectFolders: updatedFolders, rootProjectIds }),
        );
      });
  }

  deleteProjectFolder(id: string): void {
    this.projectFolders$
      .pipe(take(1), withLatestFrom(this.rootProjectIds$))
      .subscribe(([folders, rootProjectIds]) => {
        const updatedFolders = folders.filter((folder) => folder.id !== id);
        this._store.dispatch(
          updateProjectFolders({ projectFolders: updatedFolders, rootProjectIds }),
        );
      });
  }

  updateOrder(newIds: string[]): void {
    this.projectFolders$
      .pipe(take(1), withLatestFrom(this.rootProjectIds$))
      .subscribe(([folders, rootProjectIds]) => {
        const folderMap = Object.fromEntries(folders.map((f) => [f.id, f]));
        const reorderedFolders = newIds.map((id) => folderMap[id]).filter(Boolean);
        this._store.dispatch(
          updateProjectFolders({ projectFolders: reorderedFolders, rootProjectIds }),
        );
      });
  }

  toggleFolderExpansion(id: string): void {
    this.projectFolders$.pipe(take(1)).subscribe((folders) => {
      const folder = folders.find((f) => f.id === id);
      if (folder) {
        this.updateProjectFolder(id, { isExpanded: !folder.isExpanded });
      }
    });
  }

  loadProjectFolders(folders: ProjectFolder[], rootProjectIds: string[] = []): void {
    this._store.dispatch(
      updateProjectFolders({ projectFolders: folders, rootProjectIds }),
    );
  }

  updateProjectFolderRelationships(
    folders: ProjectFolder[],
    rootProjectIds: string[],
  ): void {
    this._store.dispatch(
      updateProjectFolders({ projectFolders: folders, rootProjectIds }),
    );
  }
}
