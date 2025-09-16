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
    const currentFolders = this._getCurrentFolders();
    const updatedFolders = currentFolders.map((folder) =>
      folder.id === id ? { ...folder, ...changes } : folder,
    );
    this._store.dispatch(updateProjectFolders({ projectFolders: updatedFolders }));
  }

  private _getCurrentFolders(): ProjectFolder[] {
    let folders: ProjectFolder[] = [];
    this.projectFolders$.pipe(take(1)).subscribe((f) => (folders = f));
    return folders;
  }

  addProjectFolder(folder: Omit<ProjectFolder, 'id' | 'projectIds'>): void {
    const newFolder: ProjectFolder = {
      ...folder,
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectIds: [],
    };
    const updatedFolders = [...this._getCurrentFolders(), newFolder];
    this._store.dispatch(updateProjectFolders({ projectFolders: updatedFolders }));
  }

  deleteProjectFolder(id: string): void {
    const updatedFolders = this._getCurrentFolders().filter((folder) => folder.id !== id);
    this._store.dispatch(updateProjectFolders({ projectFolders: updatedFolders }));
  }

  updateOrder(newIds: string[]): void {
    const folders = this._getCurrentFolders();
    const folderMap = Object.fromEntries(folders.map((f) => [f.id, f]));
    const reorderedFolders = newIds.map((id) => folderMap[id]).filter(Boolean);
    this._store.dispatch(updateProjectFolders({ projectFolders: reorderedFolders }));
  }

  toggleFolderExpansion(id: string): void {
    const folder = this._getCurrentFolders().find((f) => f.id === id);
    if (folder) {
      this.updateProjectFolder(id, { isExpanded: !folder.isExpanded });
    }
  }

  loadProjectFolders(folders: ProjectFolder[]): void {
    this._store.dispatch(updateProjectFolders({ projectFolders: folders }));
  }
}
