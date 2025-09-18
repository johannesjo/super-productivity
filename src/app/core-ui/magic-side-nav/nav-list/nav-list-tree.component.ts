import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
// animations removed for simplicity
import { CommonModule, NgStyle } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { TreeDndComponent } from '../../../ui/tree-dnd/tree.component';
import { MoveInstruction, TreeNode } from '../../../ui/tree-dnd/tree.types';
import { NavItemComponent } from '../nav-item/nav-item.component';
import {
  NavGroupItem,
  NavItem,
  NavMenuItem,
  NavWorkContextItem,
} from '../magic-side-nav.model';
import { MagicNavConfigService } from '../magic-nav-config.service';
import { T } from '../../../t.const';
import {
  WorkContextType,
  WorkContextCommon,
} from '../../../features/work-context/work-context.model';
import { ProjectFolderService } from '../../../features/project-folder/project-folder.service';
import { ProjectFolderTreeNode } from '../../../features/project-folder/store/project-folder.model';
import { TagService } from '../../../features/tag/tag.service';
import { TODAY_TAG } from '../../../features/tag/tag.const';
import { TreeUtilsService } from '../../../util/tree-utils.service';

// Type guard functions using the existing NavItem union types
const isNavGroupItem = (item: NavItem): item is NavGroupItem => {
  return item.type === 'group';
};

const isNavWorkContextItem = (item: NavItem): item is NavWorkContextItem => {
  return item.type === 'workContext';
};

const hasDefaultIcon = (item: NavItem): item is NavWorkContextItem => {
  return item.type === 'workContext' && 'defaultIcon' in item;
};

@Component({
  selector: 'nav-list-tree',
  standalone: true,
  imports: [
    CommonModule,
    NgStyle,
    MatIcon,
    MatIconButton,
    MatTooltip,
    MatMenuModule,
    TranslatePipe,
    TreeDndComponent,
    NavItemComponent,
  ],
  templateUrl: './nav-list-tree.component.html',
  styleUrls: ['./nav-list-tree.component.scss', './nav-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavListTreeComponent {
  private readonly _navConfigService = inject(MagicNavConfigService);
  private readonly _projectFolderService = inject(ProjectFolderService);
  private readonly _tagService = inject(TagService);
  private readonly _treeUtils = inject(TreeUtilsService);

  item = input.required<NavGroupItem>();
  showLabels = input<boolean>(true);
  isExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);

  itemClick = output<NavItem>();

  readonly T = T;

  // Access to service methods and data for visibility menu
  readonly allProjectsExceptInbox = this._navConfigService.allProjectsExceptInbox;
  readonly hasAnyProjects = this._navConfigService.hasAnyProjects;
  readonly hasAnyTags = this._navConfigService.hasAnyTags;
  private readonly _projectFolderTree = toSignal(this._projectFolderService.tree$, {
    initialValue: [],
  });

  // Type guard for items with children
  private hasChildren(item: NavItem): item is NavGroupItem | NavMenuItem {
    return 'children' in item && (item.type === 'group' || item.type === 'menu');
  }

  // Convert nav items to tree nodes - using writable signal for bidirectional updates
  readonly treeNodes = signal<TreeNode<NavGroupItem>[]>([]);

  constructor() {
    // Initialize and sync treeNodes when item or project folders change
    effect(() => {
      const item = this.item();
      const children = this.hasChildren(item) ? item.children : [];
      const nodes = children.map((child) => this.navItemToTreeNode(child));
      this.treeNodes.set(nodes);
    });
  }

  private _hasPendingDndUpdate = false;

  itemHasChildren = computed(() => {
    const item = this.item();
    return this.hasChildren(item) ? item.children.length > 0 : false;
  });

  private navItemToTreeNode(navItem: NavItem): TreeNode<NavGroupItem> {
    // Handle folders
    if (isNavGroupItem(navItem) && navItem.isFolder) {
      const children = this.hasChildren(navItem) ? navItem.children : [];
      const folderId = navItem.folderId || navItem.id;
      const existing = this._findFolderNode(folderId);
      const isExpanded =
        existing?.kind === 'folder' ? (existing.isExpanded ?? true) : true;

      return {
        id: folderId,
        label: navItem.label || '',
        isFolder: true,
        expanded: isExpanded,
        children: children.map((child) => this.navItemToTreeNode(child)),
        data: navItem as NavGroupItem,
      };
    }

    // Handle projects/tags
    return {
      id: navItem.id || '',
      label: navItem.label || '',
      isFolder: false,
      data: navItem as NavGroupItem,
    };
  }

  onHeaderClick(): void {
    this.itemClick.emit(this.item());
  }

  onChildClick(child: NavItem): void {
    this.itemClick.emit(child);
  }

  onTreeUpdated(updatedNodes: TreeNode<NavGroupItem>[]): void {
    this.treeNodes.set(updatedNodes);

    if (!this._hasPendingDndUpdate) {
      return;
    }

    this._hasPendingDndUpdate = false;

    if (this.item().id === 'projects') {
      this._applyProjectTreeChanges(updatedNodes);
    } else if (this.item().id === 'tags') {
      this._applyTagOrder(updatedNodes);
    }
  }

  onTreeMoved(_instruction?: MoveInstruction): void {
    this._hasPendingDndUpdate = true;
  }

  private _findFolderNode(id: string): ProjectFolderTreeNode | undefined {
    return this._treeUtils.findNode(this._projectFolderTree(), id);
  }

  findNavItem(id: string): NavItem | null {
    const search = (items: NavItem[]): NavItem | null => {
      for (const item of items) {
        if (item.id === id) return item;
        if (this.hasChildren(item)) {
          const children = item.children;
          const result = search(children);
          if (result) return result;
        }
      }
      return null;
    };
    const item = this.item();
    const children = this.hasChildren(item) ? item.children : [];
    return search(children);
  }

  // Helper methods for template
  getWorkContextFromNode(node: TreeNode<NavGroupItem>): WorkContextCommon | undefined {
    const navItem = this.findNavItem(node.id);
    return navItem && isNavWorkContextItem(navItem) ? navItem.workContext : undefined;
  }

  getTypeFromNode(node: TreeNode<NavGroupItem>): WorkContextType | null {
    const navItem = this.findNavItem(node.id);
    return navItem && isNavWorkContextItem(navItem) ? navItem.workContextType : null;
  }

  getDefaultIconFromNode(node: TreeNode<NavGroupItem>): string {
    const navItem = this.findNavItem(node.id);
    return navItem && hasDefaultIcon(navItem) ? navItem.defaultIcon || 'list' : 'list';
  }

  isNodeDraggable(node: TreeNode<NavGroupItem>): boolean {
    const icon = this.getDefaultIconFromNode(node);
    return icon !== 'today' && icon !== 'inbox';
  }

  getNavItemFromNode(node: TreeNode<NavGroupItem>): NavItem {
    const found = this.findNavItem(node.id);
    if (found) return found;
    // Create a fallback NavActionItem for safety
    return {
      type: 'action',
      id: node.id,
      label: node.label,
      icon: 'list',
      action: () => {},
    } as NavItem;
  }

  toggleProjectVisibility(projectId: string): void {
    this._navConfigService.toggleProjectVisibility(projectId);
  }

  createNewProject(): void {
    this._navConfigService.createNewProject();
  }

  createNewTag(): void {
    this._navConfigService.createNewTag();
  }

  shouldShowEmptyState(): boolean {
    const itemId = this.item().id;
    if (itemId === 'projects') {
      return !this.hasAnyProjects();
    } else if (itemId === 'tags') {
      return !this.hasAnyTags();
    }
    return false;
  }

  isHeaderDropZone(): boolean {
    const item = this.item();
    return (isNavGroupItem(item) && item.isFolder) || item.id === 'projects';
  }

  getProjectId(node: TreeNode<NavGroupItem>): string | undefined {
    const navItem = this.findNavItem(node.id);
    return navItem && isNavWorkContextItem(navItem) ? navItem.workContext.id : undefined;
  }

  private _applyProjectTreeChanges(nodes: TreeNode<NavGroupItem>[]): void {
    const nextTree = this._treeNodesToFolderState(nodes);
    const currentTree = this._normalizeTreeForCompare(this._projectFolderTree());
    const normalizedNext = this._normalizeTreeForCompare(nextTree);

    if (this._isProjectFolderTreeEqual(currentTree, normalizedNext)) {
      return;
    }

    this._projectFolderService.saveTree(nextTree);
  }

  private _applyTagOrder(nodes: TreeNode<NavGroupItem>[]): void {
    const orderedTagIds: string[] = [];
    const collect = (list: TreeNode<NavGroupItem>[]): void => {
      list.forEach((node) => {
        if (node.isFolder && node.children) {
          collect(node.children);
          return;
        }
        const tagId = this._extractTagId(node.id);
        if (tagId) {
          orderedTagIds.push(tagId);
        }
      });
    };
    collect(nodes);

    if (!orderedTagIds.length) {
      return;
    }

    const deduped = orderedTagIds.filter(
      (tagId, index, arr) => arr.indexOf(tagId) === index,
    );
    const reordered = [TODAY_TAG.id, ...deduped.filter((id) => id !== TODAY_TAG.id)];

    this._tagService.updateOrder(reordered);
  }

  private _treeNodesToFolderState(
    nodes: TreeNode<NavGroupItem>[],
  ): ProjectFolderTreeNode[] {
    return nodes
      .map((node) => this._nodeToFolderTreeNode(node))
      .filter((node): node is ProjectFolderTreeNode => !!node);
  }

  private _nodeToFolderTreeNode(
    node: TreeNode<NavGroupItem>,
  ): ProjectFolderTreeNode | null {
    if (node.isFolder) {
      const existing = this._findFolderNode(node.id);
      const children = this._treeNodesToFolderState(node.children ?? []);
      return {
        id: node.id,
        kind: 'folder',
        title: node.label ?? existing?.title ?? '',
        isExpanded: node.expanded ?? existing?.isExpanded ?? true,
        children,
      };
    }

    const projectId = this._extractProjectId(node.id);
    if (!projectId) {
      return null;
    }

    return { id: projectId, kind: 'project' };
  }

  private _normalizeTreeForCompare(
    nodes: ProjectFolderTreeNode[],
  ): ProjectFolderTreeNode[] {
    return nodes.map((node) =>
      node.kind === 'folder'
        ? {
            id: node.id,
            kind: 'folder',
            title: node.title ?? '',
            isExpanded: node.isExpanded ?? true,
            children: this._normalizeTreeForCompare(node.children ?? []),
          }
        : { id: node.id, kind: 'project' },
    );
  }

  private _isProjectFolderTreeEqual(
    a: ProjectFolderTreeNode[],
    b: ProjectFolderTreeNode[],
  ): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((nodeA, index) => {
      const nodeB = b[index];
      if (nodeA.id !== nodeB.id || nodeA.kind !== nodeB.kind) {
        return false;
      }
      if (nodeA.kind === 'folder' && nodeB.kind === 'folder') {
        return (
          nodeA.title === nodeB.title &&
          nodeA.isExpanded === nodeB.isExpanded &&
          this._isProjectFolderTreeEqual(nodeA.children ?? [], nodeB.children ?? [])
        );
      }
      return true;
    });
  }

  private _extractProjectId(nodeId: string): string | null {
    return nodeId.startsWith('project-') ? nodeId.replace('project-', '') : null;
  }

  private _extractTagId(nodeId: string): string | null {
    return nodeId.startsWith('tag-') ? nodeId.replace('tag-', '') : null;
  }
}
