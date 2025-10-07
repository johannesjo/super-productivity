import { Injectable, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';
import {
  MenuTreeFolderNode,
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
      kind: 'project',
      id: project.id,
      projectId: project.id,
    }));
    this.setProjectTree(tree);
  }

  initializeTagTree(tags: Tag[]): void {
    const tree = tags.map<MenuTreeTagNode>((tag) => ({
      kind: 'tag',
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
        kind: 'project',
        project,
      }),
      itemType: 'project',
    });
  }

  buildTagViewTree(tags: Tag[]): MenuTreeViewNode[] {
    return this._buildViewTree({
      storedTree: this.tagTree(),
      items: tags,
      getId: (tag) => tag.id,
      createViewNode: (tag): MenuTreeViewTagNode => ({
        kind: 'tag',
        tag,
      }),
      itemType: 'tag',
    });
  }

  setProjectTree(tree: MenuTreeTreeNode[]): void {
    this._store.dispatch(updateProjectTree({ tree }));
  }

  setTagTree(tree: MenuTreeTreeNode[]): void {
    this._store.dispatch(updateTagTree({ tree }));
  }

  persistProjectViewTree(viewNodes: MenuTreeViewNode[]): void {
    const stored = this._viewToStoredTree(viewNodes, 'project');
    this.setProjectTree(stored);
  }

  persistTagViewTree(viewNodes: MenuTreeViewNode[]): void {
    const stored = this._viewToStoredTree(viewNodes, 'tag');
    this.setTagTree(stored);
  }

  createProjectFolder(name: string, parentFolderId?: string | null): void {
    this._createFolder({
      name,
      parentFolderId: parentFolderId ?? null,
      treeKind: 'project',
    });
  }

  createTagFolder(name: string, parentFolderId?: string | null): void {
    this._createFolder({
      name,
      parentFolderId: parentFolderId ?? null,
      treeKind: 'tag',
    });
  }

  deleteFolderFromProject(folderId: string): void {
    this._store.dispatch(deleteFolder({ folderId, treeType: 'project' }));
  }

  deleteFolderFromTag(folderId: string): void {
    this._store.dispatch(deleteFolder({ folderId, treeType: 'tag' }));
  }

  updateFolderInProject(folderId: string, name: string): void {
    this._store.dispatch(updateFolder({ folderId, name, treeType: 'project' }));
  }

  updateFolderInTag(folderId: string, name: string): void {
    this._store.dispatch(updateFolder({ folderId, name, treeType: 'tag' }));
  }

  findFolderInTree(
    folderId: string,
    tree: MenuTreeTreeNode[],
  ): MenuTreeFolderNode | null {
    for (const node of tree) {
      if (node.id === folderId && node.kind === 'folder') {
        return node;
      }
      if (node.kind === 'folder') {
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
    itemType: 'project' | 'tag';
  }): MenuTreeViewNode[] {
    const { storedTree, items, getId, createViewNode, itemType } = options;
    const itemMap = new Map(items.map((item) => [getId(item), item]));
    const usedIds = new Set<string>();

    const mapNode = (node: MenuTreeTreeNode): MenuTreeViewNode | null => {
      if (node.kind === 'folder') {
        const children = node.children
          .map((child) => mapNode(child))
          .filter((child): child is MenuTreeViewNode => child !== null);
        return {
          kind: 'folder',
          id: node.id,
          name: node.name,
          isExpanded: node.isExpanded ?? true,
          children,
        } satisfies MenuTreeViewFolderNode;
      }

      if (itemType === 'project' && node.kind === 'project') {
        const project = itemMap.get(node.id);
        if (!project) {
          return null;
        }
        usedIds.add(node.id);
        return createViewNode(project) as MenuTreeViewProjectNode;
      }

      if (itemType === 'tag' && node.kind === 'tag') {
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
    itemType: 'project' | 'tag',
  ): MenuTreeTreeNode[] {
    const mapNode = (node: MenuTreeViewNode): MenuTreeTreeNode | null => {
      if (node.kind === 'folder') {
        const children = node.children
          .map((child) => mapNode(child))
          .filter((child): child is MenuTreeTreeNode => child !== null);
        return {
          kind: 'folder',
          id: node.id,
          name: node.name,
          isExpanded: node.isExpanded,
          children,
        } satisfies MenuTreeFolderNode;
      }

      if (itemType === 'project' && node.kind === 'project') {
        return {
          kind: 'project',
          id: node.project.id,
        } satisfies MenuTreeProjectNode;
      }

      if (itemType === 'tag' && node.kind === 'tag') {
        return {
          kind: 'tag',
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
        if (node.kind === 'folder') {
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
      node.kind === 'folder'
        ? {
            kind: 'folder',
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
      if (node.kind === 'folder') {
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
    treeKind: 'project' | 'tag';
  }): void {
    const trimmed = options.name.trim();
    if (!trimmed) {
      return;
    }

    const newFolder: MenuTreeFolderNode = {
      kind: 'folder',
      id: this._createFolderId(),
      name: trimmed,
      isExpanded: true,
      children: [],
    };

    const currentTree =
      options.treeKind === 'project' ? this.projectTree() : this.tagTree();
    const nextTree = this._insertFolderNode(
      currentTree,
      newFolder,
      options.parentFolderId,
    );

    if (options.treeKind === 'project') {
      this.setProjectTree(nextTree);
    } else {
      this.setTagTree(nextTree);
    }
  }
}
