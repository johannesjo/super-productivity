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
        const updatedRootLayout = rootProjectIds.includes(`folder:${newFolder.id}`)
          ? rootProjectIds
          : [...rootProjectIds, `folder:${newFolder.id}`];
        this._store.dispatch(
          updateProjectFolders({
            projectFolders: updatedFolders,
            rootProjectIds: updatedRootLayout,
          }),
        );
      });
  }

  deleteProjectFolder(id: string): void {
    this.projectFolders$
      .pipe(take(1), withLatestFrom(this.rootProjectIds$))
      .subscribe(([folders, rootLayout]) => {
        const folderToDelete = folders.find((folder) => folder.id === id);
        if (!folderToDelete) {
          return;
        }

        const childFolders = folders.filter((folder) => folder.parentId === id);

        const updatedFolders = folders
          .filter((folder) => folder.id !== id)
          .map((folder) =>
            folder.parentId === id ? { ...folder, parentId: null } : folder,
          );

        const replacementEntries: string[] = [];
        childFolders.forEach((folder) => {
          replacementEntries.push(`folder:${folder.id}`);
        });
        (folderToDelete.projectIds ?? []).forEach((projectId) => {
          replacementEntries.push(`project:${projectId}`);
        });

        const newRootLayout: string[] = [];
        let replaced = false;
        rootLayout.forEach((entry) => {
          if (entry === `folder:${id}`) {
            if (replacementEntries.length) {
              replacementEntries.forEach((value) => {
                if (!newRootLayout.includes(value)) {
                  newRootLayout.push(value);
                }
              });
            }
            replaced = true;
          } else {
            newRootLayout.push(entry);
          }
        });

        if (!replaced && replacementEntries.length) {
          replacementEntries.forEach((value) => {
            if (!newRootLayout.includes(value)) {
              newRootLayout.push(value);
            }
          });
        }

        const dedupedRootLayout = newRootLayout.filter(
          (value, index, arr) => arr.indexOf(value) === index,
        );

        this._store.dispatch(
          updateProjectFolders({
            projectFolders: updatedFolders,
            rootProjectIds: dedupedRootLayout,
          }),
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
