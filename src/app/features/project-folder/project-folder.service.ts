import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ProjectFolder, ProjectFolderState } from './store/project-folder.model';
import { updateProjectFolders } from './store/project-folder.actions';
import { projectFolderFeatureKey } from './store/project-folder.reducer';

@Injectable({
  providedIn: 'root',
})
export class ProjectFolderService {
  private readonly _store = inject(Store);

  readonly projectFolders$: Observable<ProjectFolder[]> = this._store
    .select((state: any) => state[projectFolderFeatureKey] as ProjectFolderState)
    .pipe(map((state) => state.ids.map((id) => state.entities[id])));

  readonly topLevelFolders$: Observable<ProjectFolder[]> = this.projectFolders$.pipe(
    map((folders) => folders.filter((folder) => !folder.parentId)),
  );

  getFolderById(id: string): Observable<ProjectFolder | undefined> {
    return this.projectFolders$.pipe(
      map((folders) => folders.find((folder) => folder.id === id)),
    );
  }

  updateProjectFolder(id: string, changes: Partial<ProjectFolder>): void {
    this.projectFolders$.pipe(take(1)).subscribe((folders) => {
      const updatedFolders = folders.map((folder) =>
        folder.id === id ? { ...folder, ...changes } : folder,
      );
      this._store.dispatch(updateProjectFolders({ projectFolders: updatedFolders }));
    });
  }

  addProjectFolder(folder: Omit<ProjectFolder, 'id' | 'projectIds'>): void {
    this.projectFolders$.pipe(take(1)).subscribe((folders) => {
      const newFolder: ProjectFolder = {
        ...folder,
        id: Date.now().toString(), // Simple ID generation
        projectIds: [], // Will be computed by the observable
      };
      const updatedFolders = [...folders, newFolder];
      this._store.dispatch(updateProjectFolders({ projectFolders: updatedFolders }));
    });
  }

  deleteProjectFolder(id: string): void {
    this.projectFolders$.pipe(take(1)).subscribe((folders) => {
      const updatedFolders = folders.filter((folder) => folder.id !== id);
      this._store.dispatch(updateProjectFolders({ projectFolders: updatedFolders }));
    });
  }

  updateOrder(newIds: string[]): void {
    this.projectFolders$.pipe(take(1)).subscribe((folders) => {
      const folderMap = folders.reduce(
        (acc, folder) => {
          acc[folder.id] = folder;
          return acc;
        },
        {} as { [id: string]: ProjectFolder },
      );
      const reorderedFolders = newIds
        .map((id) => folderMap[id])
        .filter((folder) => folder !== undefined);
      this._store.dispatch(updateProjectFolders({ projectFolders: reorderedFolders }));
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

  loadProjectFolders(folders: ProjectFolder[]): void {
    this._store.dispatch(updateProjectFolders({ projectFolders: folders }));
  }
}
