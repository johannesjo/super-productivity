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
import { ProjectService } from '../../../features/project/project.service';
import { TagService } from '../../../features/tag/tag.service';
import { TODAY_TAG } from '../../../features/tag/tag.const';

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
  private readonly _projectService = inject(ProjectService);
  private readonly _tagService = inject(TagService);

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

  // Project folder data for expansion state
  private readonly _projectFolders = toSignal(
    this._projectFolderService.projectFolders$,
    { initialValue: [] },
  );
  private readonly _rootProjectIdsSig = toSignal(
    this._projectFolderService.rootProjectIds$,
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
    this.treeNodes.set(updatedNodes);

    // Check for folder expansion changes and sync them to the project folder service
    this._syncFolderExpansionStates(updatedNodes);

    if (this.item().id === 'projects') {
      this._applyProjectTreeChanges(updatedNodes);
    } else if (this.item().id === 'tags') {
      this._applyTagOrder(updatedNodes);
    }
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

  private _persistProjectFolderRelationships(
    folderProjectMap: Map<string, string[]>,
    rootProjectIds: string[],
  ): void {
    const currentFolders = this._projectFolders();

    let didChange = false;
    const updatedFolders = currentFolders.map((folder) => {
      const nextProjectIds = folderProjectMap.get(folder.id) ?? [];
      if (!didChange && !this._areArraysEqual(folder.projectIds, nextProjectIds)) {
        didChange = true;
      }
      return {
        ...folder,
        projectIds: nextProjectIds,
      };
    });

    if (!didChange && this._areArraysEqual(this._rootProjectIdsSig(), rootProjectIds)) {
      return;
    }

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

  private _applyProjectTreeChanges(nodes: TreeNode<NavGroupItem>[]): void {
    const { folderProjectMap, rootProjectIds, orderedProjectIds } =
      this._collectProjectStructure(nodes);

    this._persistProjectFolderRelationships(folderProjectMap, rootProjectIds);

    const allProjects = this._navConfigService.allProjectsExceptInbox();
    const visibleProjects = allProjects.filter(
      (project) => !project.isArchived && !project.isHiddenFromMenu,
    );
    const projectLookup = new Map(
      visibleProjects.map((project) => [project.id, project]),
    );

    // Update folder assignments when necessary
    const desiredAssignment = new Map<string, string | null>();
    folderProjectMap.forEach((projectIds, folderId) => {
      projectIds.forEach((projectId) => desiredAssignment.set(projectId, folderId));
    });
    rootProjectIds.forEach((projectId) => desiredAssignment.set(projectId, null));

    desiredAssignment.forEach((targetFolderId, projectId) => {
      const project = projectLookup.get(projectId);
      if (!project) {
        return;
      }
      const currentFolder = project.folderId ?? null;
      if (currentFolder !== targetFolderId) {
        this._projectService.update(projectId, { folderId: targetFolderId });
      }
    });

    // Update order for visible projects if changed and counts match
    const dedupedOrder = orderedProjectIds.filter(
      (projectId, index, arr) => arr.indexOf(projectId) === index,
    );
    if (dedupedOrder.length !== visibleProjects.length) {
      return;
    }
    const currentOrder = visibleProjects.map((project) => project.id);
    if (!this._areArraysEqual(dedupedOrder, currentOrder)) {
      this._projectService.updateOrder(dedupedOrder);
    }
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

  private _collectProjectStructure(nodes: TreeNode<NavGroupItem>[]): {
    folderProjectMap: Map<string, string[]>;
    rootProjectIds: string[];
    orderedProjectIds: string[];
  } {
    const folderProjectMap = new Map<string, string[]>();
    const rootProjectIds: string[] = [];
    const orderedProjectIds: string[] = [];

    const visit = (node: TreeNode<NavGroupItem>, parentFolderId: string | null): void => {
      if (node.isFolder) {
        const childProjects: string[] = [];
        node.children?.forEach((child) => {
          if (child.isFolder) {
            visit(child, node.id);
          } else {
            const projectId = this._extractProjectId(child.id);
            if (projectId) {
              childProjects.push(projectId);
              orderedProjectIds.push(projectId);
            }
          }
        });
        folderProjectMap.set(node.id, childProjects);
        return;
      }

      const projectId = this._extractProjectId(node.id);
      if (projectId) {
        orderedProjectIds.push(projectId);
        if (!parentFolderId) {
          rootProjectIds.push(projectId);
        }
      }
    };

    nodes.forEach((node) => visit(node, null));

    return { folderProjectMap, rootProjectIds, orderedProjectIds };
  }

  private _extractProjectId(nodeId: string): string | null {
    return nodeId.startsWith('project-') ? nodeId.replace('project-', '') : null;
  }

  private _extractTagId(nodeId: string): string | null {
    return nodeId.startsWith('tag-') ? nodeId.replace('tag-', '') : null;
  }

  private _areArraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => value === b[index]);
  }
}
