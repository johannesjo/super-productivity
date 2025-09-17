import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map, take, withLatestFrom } from 'rxjs/operators';
import { ProjectFolder, ProjectFolderRootItem } from './store/project-folder.model';
import { updateProjectFolders } from './store/project-folder.actions';
import {
  selectAllProjectFolders,
  selectRootItems,
} from './store/project-folder.selectors';
import { nanoid } from 'nanoid';

const rootItemEquals = (a: ProjectFolderRootItem, b: ProjectFolderRootItem): boolean =>
  a.type === b.type && a.id === b.id;

const pushRootItemUnique = (
  list: ProjectFolderRootItem[],
  entry: ProjectFolderRootItem,
): ProjectFolderRootItem[] =>
  list.some((item) => rootItemEquals(item, entry)) ? list : [...list, entry];

const dedupeRootItems = (items: ProjectFolderRootItem[]): ProjectFolderRootItem[] => {
  const result: ProjectFolderRootItem[] = [];
  items.forEach((entry) => {
    if (!result.some((item) => rootItemEquals(item, entry))) {
      result.push(entry);
    }
  });
  return result;
};

@Injectable({
  providedIn: 'root',
})
export class ProjectFolderService {
  private readonly _store = inject(Store);

  readonly projectFolders$: Observable<ProjectFolder[]> = this._store.select(
    selectAllProjectFolders,
  );

  readonly rootItems$: Observable<ProjectFolderRootItem[]> =
    this._store.select(selectRootItems);

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
      .pipe(take(1), withLatestFrom(this.rootItems$))
      .subscribe(([folders, rootItems]) => {
        const updatedFolders = folders.map((folder) =>
          folder.id === id ? { ...folder, ...changes } : folder,
        );

        const folderBefore = folders.find((folder) => folder.id === id);
        let updatedRootItems = [...rootItems];
        if (changes.parentId !== undefined) {
          if (changes.parentId) {
            // moved under a parent -> remove any root entry
            updatedRootItems = updatedRootItems.filter(
              (item) => !(item.type === 'folder' && item.id === id),
            );
          } else {
            // moved to root -> add entry
            updatedRootItems = pushRootItemUnique(updatedRootItems, {
              type: 'folder',
              id,
            });
          }
        } else if (!folderBefore?.parentId) {
          // keep existing entry if already root
          updatedRootItems = pushRootItemUnique(updatedRootItems, {
            type: 'folder',
            id,
          });
        }

        this._store.dispatch(
          updateProjectFolders({
            projectFolders: updatedFolders,
            rootItems: dedupeRootItems(updatedRootItems),
          }),
        );
      });
  }

  addProjectFolder(folder: Omit<ProjectFolder, 'id' | 'projectIds'>): void {
    this.projectFolders$
      .pipe(take(1), withLatestFrom(this.rootItems$))
      .subscribe(([folders, rootItems]) => {
        const newFolder: ProjectFolder = {
          ...folder,
          id: `folder-${nanoid()}`,
          projectIds: [],
        };

        const updatedFolders = [...folders, newFolder];
        const updatedRootItems = !newFolder.parentId
          ? pushRootItemUnique(rootItems, { type: 'folder', id: newFolder.id })
          : [...rootItems];

        this._store.dispatch(
          updateProjectFolders({
            projectFolders: updatedFolders,
            rootItems: updatedRootItems,
          }),
        );
      });
  }

  deleteProjectFolder(id: string): void {
    this.projectFolders$
      .pipe(take(1), withLatestFrom(this.rootItems$))
      .subscribe(([folders, rootItems]) => {
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

        const replacementEntries: ProjectFolderRootItem[] = [];
        childFolders.forEach((folder) => {
          replacementEntries.push({ type: 'folder', id: folder.id });
        });
        (folderToDelete.projectIds ?? []).forEach((projectId) => {
          replacementEntries.push({ type: 'project', id: projectId });
        });

        let newRootItems: ProjectFolderRootItem[] = [];
        let replaced = false;
        rootItems.forEach((entry) => {
          if (entry.type === 'folder' && entry.id === id) {
            replacementEntries.forEach((replacement) => {
              newRootItems = pushRootItemUnique(newRootItems, replacement);
            });
            replaced = true;
          } else {
            newRootItems = pushRootItemUnique(newRootItems, entry);
          }
        });

        if (!replaced) {
          replacementEntries.forEach((replacement) => {
            newRootItems = pushRootItemUnique(newRootItems, replacement);
          });
        }

        this._store.dispatch(
          updateProjectFolders({
            projectFolders: updatedFolders,
            rootItems: dedupeRootItems(newRootItems),
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

  loadProjectFolders(
    folders: ProjectFolder[],
    rootItems: ProjectFolderRootItem[] = [],
  ): void {
    this._store.dispatch(
      updateProjectFolders({
        projectFolders: folders,
        rootItems: dedupeRootItems(rootItems),
      }),
    );
  }

  updateProjectFolderRelationships(
    folders: ProjectFolder[],
    rootItems: ProjectFolderRootItem[],
  ): void {
    this._store.dispatch(
      updateProjectFolders({
        projectFolders: folders,
        rootItems: dedupeRootItems(rootItems),
      }),
    );
  }
}
