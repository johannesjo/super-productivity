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
import { CommonModule, NgStyle } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { TreeDndComponent } from '../../../ui/tree-dnd/tree.component';
import { MoveInstruction, TreeNode } from '../../../ui/tree-dnd/tree.types';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { NavGroupItem, NavItem, NavMenuItem } from '../magic-side-nav.model';
import { MagicNavConfigService } from '../magic-nav-config.service';
import { T } from '../../../t.const';
import { WorkContextType } from '../../../features/work-context/work-context.model';
import { ProjectFolderService } from '../../../features/project-folder/project-folder.service';

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

  item = input.required<NavGroupItem>();
  showLabels = input<boolean>(true);
  isExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);

  itemClick = output<NavItem>();
  projectMove = output<{
    projectId: string;
    targetFolderId: string | null;
    targetIndex?: number;
  }>();

  folderMove = output<{
    folderId: string;
    targetParentFolderId: string | null;
    targetIndex?: number;
  }>();

  readonly T = T;

  // Access to service methods and data for visibility menu
  readonly allProjectsExceptInbox = this._navConfigService.allProjectsExceptInbox;
  readonly hasAnyProjects = this._navConfigService.hasAnyProjects;
  readonly hasAnyTags = this._navConfigService.hasAnyTags;

  // Project folder data for expansion state
  private readonly _projectFolders = toSignal(
    this._projectFolderService.projectFolders$,
    { initialValue: [] },
  );

  // Type guard for items with children
  private hasChildren(item: NavItem): item is NavGroupItem | NavMenuItem {
    return 'children' in item && (item.type === 'group' || item.type === 'menu');
  }

  // Convert nav items to tree nodes - using writable signal for bidirectional updates
  readonly treeNodes = signal<TreeNode[]>([]);

  constructor() {
    // Initialize and sync treeNodes when item or project folders change
    effect(() => {
      const item = this.item();
      // Also track _projectFolders to update when folder expansion states change
      this._projectFolders();

      const children = this.hasChildren(item) ? item.children : [];
      const nodes = children.map((child) => this.navItemToTreeNode(child));
      this.treeNodes.set(nodes);
    });
  }

  itemHasChildren = computed(() => {
    const item = this.item();
    return this.hasChildren(item) ? item.children.length > 0 : false;
  });

  private navItemToTreeNode(navItem: NavItem): TreeNode {
    // Handle folders
    if (navItem.id?.startsWith('folder-')) {
      const children = this.hasChildren(navItem) ? navItem.children : [];
      const folderId = navItem.id.replace('folder-', '');
      const folderData = this._projectFolders().find((f) => f.id === folderId);
      const isExpanded = folderData?.isExpanded ?? true; // Default to expanded if not found

      return {
        id: navItem.id,
        label: navItem.label || '',
        isFolder: true,
        expanded: isExpanded,
        children: children.map((child) => this.navItemToTreeNode(child)),
      };
    }

    // Handle projects/tags
    return {
      id: navItem.id || '',
      label: navItem.label || '',
      isFolder: false,
    };
  }

  onHeaderClick(): void {
    this.itemClick.emit(this.item());
  }

  onChildClick(child: NavItem): void {
    this.itemClick.emit(child);
  }

  onTreeNodeMoved(instruction: MoveInstruction): void {
    const { itemId, targetId, where } = instruction;

    // Determine if this is a folder or project move
    if (itemId.startsWith('folder-')) {
      this.handleFolderMove(itemId, targetId, where);
    } else {
      this.handleProjectMove(itemId, targetId, where);
    }
  }

  onTreeUpdated(updatedNodes: TreeNode[]): void {
    // Update our local tree nodes signal to reflect the new structure
    this.treeNodes.set(updatedNodes);

    // Check for folder expansion changes and sync them to the project folder service
    this.syncFolderExpansionStates(updatedNodes);

    // Note: The actual persistence to backend happens via the move handlers above
    // This method ensures the UI stays in sync with the tree component's internal state
  }

  private syncFolderExpansionStates(nodes: TreeNode[]): void {
    const syncNode = (node: TreeNode): void => {
      if (node.isFolder && node.id.startsWith('folder-')) {
        const folderId = node.id.replace('folder-', '');
        const currentFolderData = this._projectFolders().find((f) => f.id === folderId);

        // If the expansion state has changed, update it in the service
        if (currentFolderData && currentFolderData.isExpanded !== node.expanded) {
          this._projectFolderService.updateProjectFolder(folderId, {
            isExpanded: node.expanded,
          });
        }
      }

      // Recursively check children
      if (node.children) {
        node.children.forEach(syncNode);
      }
    };

    nodes.forEach(syncNode);
  }

  private handleProjectMove(projectId: string, targetId: string, where: string): void {
    // Normalize project id: our tree nodes use `project-<id>`
    const normalizedProjectId = projectId.startsWith('project-')
      ? projectId.replace('project-', '')
      : projectId;
    let targetFolderId: string | null = null;
    let targetIndex: number | undefined;

    if (targetId === '') {
      // Dropped at root
      targetFolderId = null;
      targetIndex = this.calculateRootIndex(where);
    } else if (targetId.startsWith('folder-')) {
      // Dropped into a folder
      targetFolderId = targetId.replace('folder-', '');
      if (where === 'inside') {
        targetIndex = this.calculateFolderChildIndex(targetId);
      } else {
        targetIndex = this.calculateSiblingIndex(targetId, where);
      }
    } else {
      // Dropped relative to another project
      targetFolderId = this.getParentFolderId(targetId);
      targetIndex = this.calculateSiblingIndex(targetId, where);
    }

    this.projectMove.emit({
      projectId: normalizedProjectId,
      targetFolderId,
      targetIndex,
    });
  }

  private handleFolderMove(folderId: string, targetId: string, where: string): void {
    let targetParentFolderId: string | null = null;
    let targetIndex: number | undefined;

    if (targetId === '' || !targetId.startsWith('folder-')) {
      // Moving to root level
      targetParentFolderId = null;
      targetIndex = this.calculateRootFolderIndex(where);
    } else {
      // Moving relative to another folder (but not inside to prevent deep nesting)
      if (where === 'inside') {
        targetParentFolderId = targetId.replace('folder-', '');
        targetIndex = 0;
      } else {
        targetParentFolderId = this.getFolderParentId(targetId);
        targetIndex = this.calculateSiblingIndex(targetId, where);
      }
    }

    this.folderMove.emit({
      folderId: folderId.replace('folder-', ''),
      targetParentFolderId,
      targetIndex,
    });
  }

  private calculateRootIndex(where: string): number {
    // Simple implementation - append at end for root level
    const item = this.item();
    const children = this.hasChildren(item) ? item.children : [];
    return children.filter((child) => !child.id?.startsWith('folder-')).length;
  }

  private calculateRootFolderIndex(where: string): number {
    const item = this.item();
    const children = this.hasChildren(item) ? item.children : [];
    return children.filter((child) => child.id?.startsWith('folder-')).length;
  }

  private calculateFolderChildIndex(folderId: string): number {
    const folder = this.findNavItem(folderId);
    const children = folder && this.hasChildren(folder) ? folder.children : [];
    return children.length || 0;
  }

  private calculateSiblingIndex(siblingId: string, where: string): number {
    const item = this.item();
    const siblings = this.hasChildren(item) ? item.children : [];
    const siblingIndex = siblings.findIndex((child) => child.id === siblingId);
    return where === 'after' ? siblingIndex + 1 : siblingIndex;
  }

  private getParentFolderId(itemId: string): string | null {
    // Find the parent folder of an item
    const findParent = (items: NavItem[]): string | null => {
      for (const item of items) {
        if (this.hasChildren(item)) {
          const children = item.children;
          if (children.some((child) => child.id === itemId)) {
            return item.id?.startsWith('folder-') ? item.id.replace('folder-', '') : null;
          }
          const result = findParent(children);
          if (result !== null) return result;
        }
      }
      return null;
    };
    const item = this.item();
    const children = this.hasChildren(item) ? item.children : [];
    return findParent(children);
  }

  private getFolderParentId(folderId: string): string | null {
    return this.getParentFolderId(folderId);
  }

  private findNavItem(id: string): NavItem | null {
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
  getWorkContextFromNode(node: TreeNode): any {
    const navItem = this.findNavItem(node.id);
    return (navItem as any)?.workContext;
  }

  getTypeFromNode(node: TreeNode): WorkContextType | null {
    const navItem = this.findNavItem(node.id) as any;
    return (navItem?.workContextType as WorkContextType) ?? null;
  }

  getDefaultIconFromNode(node: TreeNode): string {
    const navItem = this.findNavItem(node.id);
    return (navItem as any)?.defaultIcon || 'list';
  }

  isNodeDraggable(node: TreeNode): boolean {
    const icon = this.getDefaultIconFromNode(node);
    return icon !== 'today' && icon !== 'inbox';
  }

  getNavItemFromNode(node: TreeNode): NavItem {
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
    return this.item().id?.startsWith('folder-') || this.item().id === 'projects';
  }

  getProjectId(node: TreeNode): string | undefined {
    const navItem = this.findNavItem(node.id);
    return (navItem as any)?.workContext?.id;
  }
}
