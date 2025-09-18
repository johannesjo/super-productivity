import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  ProjectFolderTreeNode,
  ProjectFolderSummary,
  sanitizeProjectFolderTree,
} from './store/project-folder.model';
import {
  selectAllProjectFolders,
  selectProjectFolderState,
  selectProjectFolderTree,
} from './store/project-folder.selectors';
import { updateProjectFolders } from './store/project-folder.actions';
import { TreeUtilsService } from '../../util/tree-utils.service';

@Injectable({ providedIn: 'root' })
export class ProjectFolderService {
  private readonly _store = inject(Store);
  private readonly _treeUtils = inject(TreeUtilsService);

  readonly projectFolders$: Observable<ProjectFolderSummary[]> = this._store.select(
    selectAllProjectFolders,
  );

  readonly topLevelFolders$: Observable<ProjectFolderSummary[]> =
    this.projectFolders$.pipe(
      map((folders) => folders.filter((folder) => !folder.parentId)),
    );

  readonly tree$: Observable<ProjectFolderTreeNode[]> = this._store.select(
    selectProjectFolderTree,
  );

  getFolderNodeById(id: string): Observable<ProjectFolderTreeNode | undefined> {
    return this.tree$.pipe(
      take(1),
      map((tree) => this._treeUtils.findNode(tree, id)),
    );
  }

  getFolderSummaryById(id: string): Observable<ProjectFolderSummary | undefined> {
    return this.projectFolders$.pipe(
      take(1),
      map((folders) => folders.find((folder) => folder.id === id)),
    );
  }

  saveTree(tree: ProjectFolderTreeNode[]): void {
    this._store.dispatch(updateProjectFolders({ tree: sanitizeProjectFolderTree(tree) }));
  }

  addFolder(title: string, parentId: string | null): Promise<void> {
    return this._mutateTree((tree) => {
      const newNode: ProjectFolderTreeNode = {
        id: `folder-${nanoid()}`,
        kind: 'folder',
        title,
        isExpanded: true,
        children: [],
      };
      return this._treeUtils.insertNode(tree, newNode, parentId, undefined);
    });
  }

  updateFolder(
    id: string,
    changes: Partial<{ title: string; isExpanded: boolean; parentId: string | null }>,
  ): Promise<void> {
    if (changes.parentId !== undefined) {
      return this._moveFolderToParent(id, changes);
    } else {
      return this._updateFolderProperties(id, changes);
    }
  }

  private _moveFolderToParent(
    id: string,
    changes: Partial<{ title: string; isExpanded: boolean; parentId: string | null }>,
  ): Promise<void> {
    return this._mutateTree((tree) => {
      const removal = this._treeUtils.removeNode(tree, id);
      if (!removal) {
        return tree;
      }
      const { tree: withoutNode, removed } = removal;
      if (removed.kind !== 'folder') {
        return tree;
      }
      const updatedNode: ProjectFolderTreeNode = {
        ...removed,
        title: changes.title ?? removed.title,
        isExpanded: changes.isExpanded ?? removed.isExpanded,
      };
      return this._treeUtils.insertNode(
        withoutNode,
        updatedNode,
        changes.parentId ?? null,
        undefined,
      );
    });
  }

  private _updateFolderProperties(
    id: string,
    changes: Partial<{ title: string; isExpanded: boolean }>,
  ): Promise<void> {
    return this._mutateTree((tree) =>
      this._treeUtils.mapTree(tree, (node) =>
        node.id === id && node.kind === 'folder'
          ? {
              ...node,
              title: changes.title ?? node.title,
              isExpanded: changes.isExpanded ?? node.isExpanded,
            }
          : node,
      ),
    );
  }

  toggleFolderExpansion(id: string): Promise<void> {
    return this._mutateTree((tree) =>
      this._treeUtils.mapTree(tree, (node) =>
        node.id === id && node.kind === 'folder'
          ? { ...node, isExpanded: !(node.isExpanded ?? true) }
          : node,
      ),
    );
  }

  deleteFolder(id: string): Promise<void> {
    return this._mutateTree((tree) => {
      const removal = this._treeUtils.removeNode(tree, id);
      if (!removal) {
        return tree;
      }
      const { tree: withoutNode, removed } = removal;
      if (removed.kind !== 'folder') {
        return withoutNode;
      }
      return [...(removed.children ?? []), ...withoutNode];
    });
  }

  private async _mutateTree(
    updater: (tree: ProjectFolderTreeNode[]) => ProjectFolderTreeNode[],
  ): Promise<void> {
    const state = await this._store
      .select(selectProjectFolderState)
      .pipe(take(1))
      .toPromise();
    const nextTree = sanitizeProjectFolderTree(updater(state.tree));
    this._store.dispatch(updateProjectFolders({ tree: nextTree }));
  }
}
