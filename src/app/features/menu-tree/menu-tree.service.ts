import { Injectable, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';
import {
  MenuTreeFolderNode,
  MenuTreeKind,
  MenuTreeProjectNode,
  MenuTreeTagNode,
  MenuTreeTreeNode,
  MenuTreeViewFolderNode,
  MenuTreeViewNode,
  MenuTreeViewProjectNode,
  MenuTreeViewTagNode,
} from './store/menu-tree.model';
import {
  selectMenuTreeProjectTree,
  selectMenuTreeTagTree,
} from './store/menu-tree.selectors';
import {
  updateProjectTree,
  updateTagTree,
  deleteFolder,
  updateFolder,
} from './store/menu-tree.actions';

@Injectable({ providedIn: 'root' })
export class MenuTreeService {
  private readonly _store = inject(Store);

  private readonly _projectTree = toSignal(
    this._store.select(selectMenuTreeProjectTree),
    {
      initialValue: [] as MenuTreeTreeNode[],
    },
  );
  private readonly _tagTree = toSignal(this._store.select(selectMenuTreeTagTree), {
    initialValue: [] as MenuTreeTreeNode[],
  });

  readonly projectTree = computed(() => this._projectTree());
  readonly tagTree = computed(() => this._tagTree());

  readonly projectFolders$ = this._store
    .select(selectMenuTreeProjectTree)
    .pipe(map((tree) => this._collectFolders(tree)));

  hasProjectTree(): boolean {
    return this.projectTree().length > 0;
  }

  hasTagTree(): boolean {
    return this.tagTree().length > 0;
  }

  initializeProjectTree(projects: Project[]): void {
    const tree = projects.map<MenuTreeProjectNode>((project) => ({
      kind: MenuTreeKind.PROJECT,
      id: project.id,
      projectId: project.id,
    }));
    this.setProjectTree(tree);
  }

  initializeTagTree(tags: Tag[]): void {
    const tree = tags.map<MenuTreeTagNode>((tag) => ({
      kind: MenuTreeKind.TAG,
      id: tag.id,
      tagId: tag.id,
    }));
    this.setTagTree(tree);
  }

  buildProjectViewTree(projects: Project[]): MenuTreeViewNode[] {
    return this._buildViewTree({
      storedTree: this.projectTree(),
      items: projects,
      getId: (project) => project.id,
      createViewNode: (project): MenuTreeViewProjectNode => ({
        kind: MenuTreeKind.PROJECT,
        project,
      }),
      itemType: MenuTreeKind.PROJECT,
    });
  }

  buildTagViewTree(tags: Tag[]): MenuTreeViewNode[] {
    return this._buildViewTree({
      storedTree: this.tagTree(),
      items: tags,
      getId: (tag) => tag.id,
      createViewNode: (tag): MenuTreeViewTagNode => ({
        kind: MenuTreeKind.TAG,
        tag,
      }),
      itemType: MenuTreeKind.TAG,
    });
  }

  setProjectTree(tree: MenuTreeTreeNode[]): void {
    this._store.dispatch(updateProjectTree({ tree }));
  }

  setTagTree(tree: MenuTreeTreeNode[]): void {
    this._store.dispatch(updateTagTree({ tree }));
  }

  persistProjectViewTree(viewNodes: MenuTreeViewNode[]): void {
    const stored = this._viewToStoredTree(viewNodes, MenuTreeKind.PROJECT);
    this.setProjectTree(stored);
  }

  persistTagViewTree(viewNodes: MenuTreeViewNode[]): void {
    const stored = this._viewToStoredTree(viewNodes, MenuTreeKind.TAG);
    this.setTagTree(stored);
  }

  createProjectFolder(name: string, parentFolderId?: string | null): void {
    this._createFolder({
      name,
      parentFolderId: parentFolderId ?? null,
      treeKind: MenuTreeKind.PROJECT,
    });
  }

  createTagFolder(name: string, parentFolderId?: string | null): void {
    this._createFolder({
      name,
      parentFolderId: parentFolderId ?? null,
      treeKind: MenuTreeKind.TAG,
    });
  }

  deleteFolderFromProject(folderId: string): void {
    this._store.dispatch(deleteFolder({ folderId, treeType: MenuTreeKind.PROJECT }));
  }

  deleteFolderFromTag(folderId: string): void {
    this._store.dispatch(deleteFolder({ folderId, treeType: MenuTreeKind.TAG }));
  }

  updateFolderInProject(folderId: string, name: string): void {
    this._store.dispatch(
      updateFolder({ folderId, name, treeType: MenuTreeKind.PROJECT }),
    );
  }

  updateFolderInTag(folderId: string, name: string): void {
    this._store.dispatch(updateFolder({ folderId, name, treeType: MenuTreeKind.TAG }));
  }

  findFolderInTree(
    folderId: string,
    tree: MenuTreeTreeNode[],
  ): MenuTreeFolderNode | null {
    for (const node of tree) {
      if (node.id === folderId && node.kind === MenuTreeKind.FOLDER) {
        return node;
      }
      if (node.kind === MenuTreeKind.FOLDER) {
        const found = this.findFolderInTree(folderId, node.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  private _buildViewTree<T extends { id: string }>(options: {
    storedTree: MenuTreeTreeNode[];
    items: T[];
    getId: (item: T) => string;
    createViewNode: (item: T) => MenuTreeViewNode;
    itemType: MenuTreeKind;
  }): MenuTreeViewNode[] {
    const { storedTree, items, getId, createViewNode, itemType } = options;
    const itemMap = new Map(items.map((item) => [getId(item), item]));
    const usedIds = new Set<string>();

    const mapNode = (node: MenuTreeTreeNode): MenuTreeViewNode | null => {
      if (node.kind === MenuTreeKind.FOLDER) {
        const children = node.children
          .map((child) => mapNode(child))
          .filter((child): child is MenuTreeViewNode => child !== null);
        return {
          kind: MenuTreeKind.FOLDER,
          id: node.id,
          name: node.name,
          isExpanded: node.isExpanded ?? true,
          children,
        } satisfies MenuTreeViewFolderNode;
      }

      if (itemType === MenuTreeKind.PROJECT && node.kind === MenuTreeKind.PROJECT) {
        const project = itemMap.get(node.id);
        if (!project) {
          return null;
        }
        usedIds.add(node.id);
        return createViewNode(project) as MenuTreeViewProjectNode;
      }

      if (itemType === MenuTreeKind.TAG && node.kind === MenuTreeKind.TAG) {
        const tag = itemMap.get(node.id);
        if (!tag) {
          return null;
        }
        usedIds.add(node.id);
        return createViewNode(tag) as MenuTreeViewTagNode;
      }

      return null;
    };

    const viewNodes = storedTree
      .map((node) => mapNode(node))
      .filter((node): node is MenuTreeViewNode => node !== null);

    // Append items missing from stored tree
    items.forEach((item) => {
      const id = getId(item);
      if (!usedIds.has(id)) {
        viewNodes.push(createViewNode(item));
      }
    });

    return viewNodes;
  }

  private _viewToStoredTree(
    nodes: MenuTreeViewNode[],
    itemType: MenuTreeKind,
  ): MenuTreeTreeNode[] {
    const mapNode = (node: MenuTreeViewNode): MenuTreeTreeNode | null => {
      if (node.kind === MenuTreeKind.FOLDER) {
        const children = node.children
          .map((child) => mapNode(child))
          .filter((child): child is MenuTreeTreeNode => child !== null);
        return {
          kind: MenuTreeKind.FOLDER,
          id: node.id,
          name: node.name,
          isExpanded: node.isExpanded,
          children,
        } satisfies MenuTreeFolderNode;
      }

      if (itemType === MenuTreeKind.PROJECT && node.kind === MenuTreeKind.PROJECT) {
        return {
          kind: MenuTreeKind.PROJECT,
          id: node.project.id,
        } satisfies MenuTreeProjectNode;
      }

      if (itemType === MenuTreeKind.TAG && node.kind === MenuTreeKind.TAG) {
        return {
          kind: MenuTreeKind.TAG,
          id: node.tag.id,
        } satisfies MenuTreeTagNode;
      }

      return null;
    };

    return nodes
      .map((node) => mapNode(node))
      .filter((node): node is MenuTreeTreeNode => node !== null);
  }

  private _collectFolders(
    nodes: MenuTreeTreeNode[],
  ): Array<{ id: string; name: string }> {
    const result: Array<{ id: string; name: string }> = [];
    const walk = (list: MenuTreeTreeNode[]): void => {
      list.forEach((node) => {
        if (node.kind === MenuTreeKind.FOLDER) {
          result.push({ id: node.id, name: node.name });
          walk(node.children);
        }
      });
    };
    walk(nodes);
    return result;
  }

  private _insertFolderNode(
    tree: MenuTreeTreeNode[],
    folder: MenuTreeFolderNode,
    parentId: string | null,
  ): MenuTreeTreeNode[] {
    const cloned = this._cloneTree(tree);
    if (!parentId) {
      return [...cloned, folder];
    }

    const target = this._findFolder(cloned, parentId);
    if (!target) {
      return [...cloned, folder];
    }

    target.children = [...target.children, folder];
    target.isExpanded = true;
    return cloned;
  }

  private _cloneTree(tree: MenuTreeTreeNode[]): MenuTreeTreeNode[] {
    return tree.map((node) =>
      node.kind === MenuTreeKind.FOLDER
        ? {
            kind: MenuTreeKind.FOLDER,
            id: node.id,
            name: node.name,
            isExpanded: node.isExpanded,
            children: this._cloneTree(node.children),
          }
        : { ...node },
    );
  }

  private _findFolder(tree: MenuTreeTreeNode[], id: string): MenuTreeFolderNode | null {
    for (const node of tree) {
      if (node.kind === MenuTreeKind.FOLDER) {
        if (node.id === id) {
          return node;
        }
        const childMatch = this._findFolder(node.children, id);
        if (childMatch) {
          return childMatch;
        }
      }
    }
    return null;
  }

  private _createFolderId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `folder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private _createFolder(options: {
    name: string;
    parentFolderId: string | null;
    treeKind: MenuTreeKind;
  }): void {
    const trimmed = options.name.trim();
    if (!trimmed) {
      return;
    }

    const newFolder: MenuTreeFolderNode = {
      kind: MenuTreeKind.FOLDER,
      id: this._createFolderId(),
      name: trimmed,
      isExpanded: true,
      children: [],
    };

    const currentTree =
      options.treeKind === MenuTreeKind.PROJECT ? this.projectTree() : this.tagTree();
    const nextTree = this._insertFolderNode(
      currentTree,
      newFolder,
      options.parentFolderId,
    );

    if (options.treeKind === MenuTreeKind.PROJECT) {
      this.setProjectTree(nextTree);
    } else {
      this.setTagTree(nextTree);
    }
  }
}
