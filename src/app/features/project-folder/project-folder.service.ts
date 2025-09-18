import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  ProjectFolderTreeNode,
  ProjectFolderSummary,
} from './store/project-folder.model';
import {
  selectAllProjectFolders,
  selectProjectFolderState,
  selectProjectFolderTree,
} from './store/project-folder.selectors';
import { updateProjectFolders } from './store/project-folder.actions';

@Injectable({ providedIn: 'root' })
export class ProjectFolderService {
  private readonly _store = inject(Store);

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
      map((tree) => this._find(tree, id)),
    );
  }

  getFolderSummaryById(id: string): Observable<ProjectFolderSummary | undefined> {
    return this.projectFolders$.pipe(
      take(1),
      map((folders) => folders.find((folder) => folder.id === id)),
    );
  }

  saveTree(tree: ProjectFolderTreeNode[]): void {
    this._store.dispatch(updateProjectFolders({ tree: this._sanitize(tree) }));
  }

  addFolder(title: string, parentId: string | null): void {
    this._mutateTree((tree) => {
      const newNode: ProjectFolderTreeNode = {
        id: `folder-${nanoid()}`,
        kind: 'folder',
        title,
        isExpanded: true,
        children: [],
      };
      return this._insertNode(tree, newNode, parentId, undefined);
    });
  }

  updateFolder(
    id: string,
    changes: Partial<{ title: string; isExpanded: boolean; parentId: string | null }>,
  ): void {
    if (changes.parentId !== undefined) {
      this._mutateTree((tree) => {
        const removal = this._removeNode(tree, id);
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
        return this._insertNode(
          withoutNode,
          updatedNode,
          changes.parentId ?? null,
          undefined,
        );
      });
      return;
    }

    this._mutateTree((tree) =>
      this._mapTree(tree, (node) =>
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

  toggleFolderExpansion(id: string): void {
    this._mutateTree((tree) =>
      this._mapTree(tree, (node) =>
        node.id === id && node.kind === 'folder'
          ? { ...node, isExpanded: !(node.isExpanded ?? true) }
          : node,
      ),
    );
  }

  deleteFolder(id: string): void {
    this._mutateTree((tree) => {
      const removal = this._removeNode(tree, id);
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

  private _mutateTree(
    updater: (tree: ProjectFolderTreeNode[]) => ProjectFolderTreeNode[],
  ): void {
    this._store
      .select(selectProjectFolderState)
      .pipe(take(1))
      .subscribe((state) => {
        const nextTree = this._sanitize(updater(state.tree));
        this._store.dispatch(updateProjectFolders({ tree: nextTree }));
      });
  }

  private _find(
    tree: ProjectFolderTreeNode[],
    id: string,
  ): ProjectFolderTreeNode | undefined {
    for (const node of tree) {
      if (node.id === id) {
        return node;
      }
      if (node.kind === 'folder') {
        const found = this._find(node.children ?? [], id);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  private _mapTree(
    tree: ProjectFolderTreeNode[],
    mapFn: (node: ProjectFolderTreeNode) => ProjectFolderTreeNode,
  ): ProjectFolderTreeNode[] {
    return tree.map((node) => {
      const mapped = mapFn(node);
      if (mapped.kind === 'folder') {
        return {
          ...mapped,
          children: this._mapTree(mapped.children ?? [], mapFn),
        };
      }
      return mapped;
    });
  }

  private _insertNode(
    tree: ProjectFolderTreeNode[],
    node: ProjectFolderTreeNode,
    parentId: string | null,
    index: number | undefined,
  ): ProjectFolderTreeNode[] {
    if (!parentId) {
      const copy = [...tree];
      if (index === undefined || index < 0 || index > copy.length) {
        copy.push(node);
      } else {
        copy.splice(index, 0, node);
      }
      return copy;
    }

    return tree.map((item) => {
      if (item.id === parentId && item.kind === 'folder') {
        const children = item.children ? [...item.children] : [];
        const filtered = children.filter((child) => child.id !== node.id);
        if (index === undefined || index < 0 || index > filtered.length) {
          filtered.push(node);
        } else {
          filtered.splice(index, 0, node);
        }
        return {
          ...item,
          children: filtered,
        };
      }
      if (item.kind === 'folder') {
        return {
          ...item,
          children: this._insertNode(item.children ?? [], node, parentId, index),
        };
      }
      return item;
    });
  }

  private _removeNode(
    tree: ProjectFolderTreeNode[],
    id: string,
  ): { tree: ProjectFolderTreeNode[]; removed: ProjectFolderTreeNode } | null {
    const copy = [...tree];
    for (let i = 0; i < copy.length; i++) {
      const node = copy[i];
      if (node.id === id) {
        copy.splice(i, 1);
        return { tree: copy, removed: node };
      }
      if (node.kind === 'folder') {
        const result = this._removeNode(node.children ?? [], id);
        if (result) {
          copy[i] = { ...node, children: result.tree };
          return { tree: copy, removed: result.removed };
        }
      }
    }
    return null;
  }

  private _sanitize(tree: ProjectFolderTreeNode[]): ProjectFolderTreeNode[] {
    const sanitizeNode = (node: ProjectFolderTreeNode): ProjectFolderTreeNode => {
      if (node.kind === 'folder') {
        return {
          id: node.id,
          kind: 'folder',
          title: node.title ?? '',
          isExpanded: node.isExpanded ?? true,
          children: this._sanitize(node.children ?? []),
        };
      }
      return { id: node.id, kind: 'project' };
    };
    return tree.map(sanitizeNode);
  }
}
