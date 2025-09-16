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
    const currentFolders = this._getCurrentFolders();
    const currentRootProjectIds = this._getCurrentRootProjectIds();
    const updatedFolders = currentFolders.map((folder) =>
      folder.id === id ? { ...folder, ...changes } : folder,
    );
    this._store.dispatch(
      updateProjectFolders({
        projectFolders: updatedFolders,
        rootProjectIds: currentRootProjectIds,
      }),
    );
  }

  private _getCurrentFolders(): ProjectFolder[] {
    let folders: ProjectFolder[] = [];
    this.projectFolders$.pipe(take(1)).subscribe((f) => (folders = f));
    return folders;
  }

  private _getCurrentRootProjectIds(): string[] {
    let rootProjectIds: string[] = [];
    this.rootProjectIds$.pipe(take(1)).subscribe((ids) => (rootProjectIds = ids));
    return rootProjectIds;
  }

  addProjectFolder(folder: Omit<ProjectFolder, 'id' | 'projectIds'>): void {
    const newFolder: ProjectFolder = {
      ...folder,
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectIds: [],
    };
    const updatedFolders = [...this._getCurrentFolders(), newFolder];
    const currentRootProjectIds = this._getCurrentRootProjectIds();
    this._store.dispatch(
      updateProjectFolders({
        projectFolders: updatedFolders,
        rootProjectIds: currentRootProjectIds,
      }),
    );
  }

  deleteProjectFolder(id: string): void {
    const updatedFolders = this._getCurrentFolders().filter((folder) => folder.id !== id);
    const currentRootProjectIds = this._getCurrentRootProjectIds();
    this._store.dispatch(
      updateProjectFolders({
        projectFolders: updatedFolders,
        rootProjectIds: currentRootProjectIds,
      }),
    );
  }

  updateOrder(newIds: string[]): void {
    const folders = this._getCurrentFolders();
    const folderMap = Object.fromEntries(folders.map((f) => [f.id, f]));
    const reorderedFolders = newIds.map((id) => folderMap[id]).filter(Boolean);
    const currentRootProjectIds = this._getCurrentRootProjectIds();
    this._store.dispatch(
      updateProjectFolders({
        projectFolders: reorderedFolders,
        rootProjectIds: currentRootProjectIds,
      }),
    );
  }

  toggleFolderExpansion(id: string): void {
    const folder = this._getCurrentFolders().find((f) => f.id === id);
    if (folder) {
      this.updateProjectFolder(id, { isExpanded: !folder.isExpanded });
    }
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
