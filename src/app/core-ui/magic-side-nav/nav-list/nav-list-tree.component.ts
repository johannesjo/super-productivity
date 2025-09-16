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
import { TreeNode } from '../../../ui/tree-dnd/tree.types';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { NavGroupItem, NavItem, NavMenuItem } from '../magic-side-nav.model';
import { MagicNavConfigService } from '../magic-nav-config.service';
import { T } from '../../../t.const';
import { WorkContextType } from '../../../features/work-context/work-context.model';
import { ProjectFolderService } from '../../../features/project-folder/project-folder.service';
import { Log } from '../../../core/log';

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
  readonly treeNodes = signal<TreeNode<NavGroupItem>[]>([]);

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

  private navItemToTreeNode(navItem: NavItem): TreeNode<NavGroupItem> {
    // Handle folders
    if ((navItem as any).isFolder) {
      const children = this.hasChildren(navItem) ? navItem.children : [];
      const folderId = (navItem as any).folderId || navItem.id;
      const folderData = this._projectFolders().find((f) => f.id === folderId);
      const isExpanded = folderData?.isExpanded ?? true; // Default to expanded if not found

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
    Log.x(updatedNodes);

    // Update our local tree nodes signal to reflect the new structure
    this.treeNodes.set(updatedNodes);

    // Check for folder expansion changes and sync them to the project folder service
    this._syncFolderExpansionStates(updatedNodes);

    // Extract and persist project folder relationships from the tree structure
    this._persistProjectFolderRelationships(updatedNodes);
  }

  private _syncFolderExpansionStates(nodes: TreeNode<NavGroupItem>[]): void {
    const syncNode = (node: TreeNode<NavGroupItem>): void => {
      if (node.isFolder) {
        const folderId = node.id;
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

  private _persistProjectFolderRelationships(nodes: TreeNode<NavGroupItem>[]): void {
    const folderUpdates: { id: string; projectIds: string[] }[] = [];
    const rootProjectIds: string[] = [];

    const extractFolderData = (node: TreeNode<NavGroupItem>): void => {
      if (node.isFolder) {
        const projectIds =
          node.children
            ?.filter((child) => !child.isFolder)
            .map((child) => child.id.replace('project-', '')) || [];

        folderUpdates.push({ id: node.id, projectIds });

        // Process sub-folders recursively
        node.children?.filter((child) => child.isFolder).forEach(extractFolderData);
      } else {
        // This is a root-level project
        rootProjectIds.push(node.id.replace('project-', ''));
      }
    };

    nodes.forEach(extractFolderData);

    // Update the project folder service with both folder relationships and root project order
    const currentFolders = this._projectFolders();
    const updatedFolders = currentFolders.map((folder) => {
      const update = folderUpdates.find((u) => u.id === folder.id);
      return update ? { ...folder, projectIds: update.projectIds } : folder;
    });

    this._projectFolderService.updateProjectFolderRelationships(
      updatedFolders,
      rootProjectIds,
    );
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
  getWorkContextFromNode(node: TreeNode<NavGroupItem>): any {
    const navItem = this.findNavItem(node.id);
    return (navItem as any)?.workContext;
  }

  getTypeFromNode(node: TreeNode<NavGroupItem>): WorkContextType | null {
    const navItem = this.findNavItem(node.id) as any;
    return (navItem?.workContextType as WorkContextType) ?? null;
  }

  getDefaultIconFromNode(node: TreeNode<NavGroupItem>): string {
    const navItem = this.findNavItem(node.id);
    return (navItem as any)?.defaultIcon || 'list';
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
    return (this.item() as any).isFolder === true || this.item().id === 'projects';
  }

  getProjectId(node: TreeNode<NavGroupItem>): string | undefined {
    const navItem = this.findNavItem(node.id);
    return (navItem as any)?.workContext?.id;
  }
}
