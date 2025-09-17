import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { WorkContextType } from '../../features/work-context/work-context.model';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { TagService } from '../../features/tag/tag.service';
import { ProjectService } from '../../features/project/project.service';
import { ProjectFolderService } from '../../features/project-folder/project-folder.service';
import { ShepherdService } from '../../features/shepherd/shepherd.service';
import { TourId } from '../../features/shepherd/shepherd-steps.const';
import { T } from '../../t.const';
import { LS } from '../../core/persistence/storage-keys.const';
import { DialogCreateProjectComponent } from '../../features/project/dialogs/create-project/dialog-create-project.component';
import { DialogCreateEditProjectFolderComponent } from '../../features/project-folder/dialogs/create-edit-project-folder/dialog-create-edit-project-folder.component';
import { getGithubErrorUrl } from '../../core/error-handler/global-error-handler.util';
import { DialogPromptComponent } from '../../ui/dialog-prompt/dialog-prompt.component';
import {
  selectAllProjectsExceptInbox,
  selectUnarchivedVisibleProjects,
} from '../../features/project/store/project.selectors';
import { toggleHideFromMenu } from '../../features/project/store/project.actions';
import { NavConfig, NavItem, NavWorkContextItem } from './magic-side-nav.model';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { PluginBridgeService } from '../../plugins/plugin-bridge.service';
import { Log } from '../../core/log';
import { lsGetBoolean, lsSetItem } from '../../util/ls-util';

@Injectable({
  providedIn: 'root',
})
export class MagicNavConfigService {
  private readonly _workContextService = inject(WorkContextService);
  private readonly _tagService = inject(TagService);
  private readonly _projectService = inject(ProjectService);
  private readonly _projectFolderService = inject(ProjectFolderService);
  private readonly _shepherdService = inject(ShepherdService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _store = inject(Store);
  private readonly _pluginBridge = inject(PluginBridgeService);

  // Simple state signals
  private readonly _isProjectsExpanded = signal(
    lsGetBoolean(LS.IS_PROJECT_LIST_EXPANDED, true),
  );
  private readonly _isTagsExpanded = signal(lsGetBoolean(LS.IS_TAG_LIST_EXPANDED, true));

  // Data signals
  private readonly _mainWorkContext = toSignal(
    this._workContextService.mainWorkContext$,
    { initialValue: null },
  );
  private readonly _inboxContext = toSignal(this._workContextService.inboxWorkContext$, {
    initialValue: null,
  });
  private readonly _visibleProjects = toSignal(
    this._store.select(selectUnarchivedVisibleProjects),
    { initialValue: [] },
  );
  private readonly _projectFolders = toSignal(
    this._projectFolderService.projectFolders$,
    { initialValue: [] },
  );
  private readonly _rootProjectIds = toSignal(
    this._projectFolderService.rootProjectIds$,
    { initialValue: [] },
  );
  private readonly _allProjectsExceptInbox = toSignal(
    this._store.select(selectAllProjectsExceptInbox),
    { initialValue: [] },
  );
  private readonly _tags = toSignal(this._tagService.tagsNoMyDayAndNoList$, {
    initialValue: [],
  });
  private readonly _activeWorkContextId = toSignal(
    this._workContextService.activeWorkContextId$,
    { initialValue: null },
  );
  private readonly _pluginMenuEntries = this._pluginBridge.menuEntries;

  // Main navigation configuration
  readonly navConfig = computed<NavConfig>(() => ({
    items: [
      // Work Context Items
      ...this._buildWorkContextItems(),

      // Separator

      // Main Routes
      {
        type: 'route',
        id: 'schedule',
        label: T.MH.SCHEDULE,
        icon: 'early_on',
        svgIcon: 'early_on',

        route: '/schedule',
      },
      {
        type: 'route',
        id: 'planner',
        label: T.MH.PLANNER,
        icon: 'edit_calendar',
        route: '/planner',
      },
      {
        type: 'route',
        id: 'boards',
        label: T.MH.BOARDS,
        icon: 'grid_view',
        route: '/boards',
      },

      // Plugin entries
      ...this._buildPluginItems(),

      // Separator
      { type: 'separator', id: 'sep-2' },

      // Projects Section
      {
        type: 'group',
        id: 'projects',
        label: T.MH.PROJECTS,
        icon: 'expand_more',
        children: this._buildProjectItems(),
        action: () => this._toggleProjectsExpanded(),
        additionalButtons: [
          {
            id: 'project-visibility',
            icon: 'visibility',
            tooltip: 'Show/Hide Projects',
            action: () => this._openProjectVisibilityMenu(),
          },
          {
            id: 'add-project-folder',
            icon: 'create_new_folder',
            tooltip: 'Create Project Folder',
            action: () => this._openCreateProjectFolder(),
          },
          {
            id: 'add-project',
            icon: 'add',
            tooltip: T.MH.CREATE_PROJECT,
            action: () => this._openCreateProject(),
          },
        ],
      },

      // Tags Section
      {
        type: 'group',
        id: 'tags',
        label: T.MH.TAGS,
        icon: 'expand_more',
        children: this._buildTagItems(),
        action: () => this._toggleTagsExpanded(),
      },

      // Separator
      { type: 'separator', id: 'sep-3', mtAuto: true },

      // App Section
      {
        type: 'route',
        id: 'search',
        label: T.MH.SEARCH,
        icon: 'search',
        route: '/search',
      },
      {
        type: 'route',
        id: 'scheduled-list',
        label: T.MH.ALL_PLANNED_LIST,
        icon: 'list',
        route: '/scheduled-list',
      },

      // Help Menu (rendered as mat-menu)
      {
        type: 'menu',
        id: 'help',
        label: T.MH.HELP,
        icon: 'help_center',
        children: [
          {
            type: 'href',
            id: 'help-online',
            label: T.MH.HM.GET_HELP_ONLINE,
            icon: 'help_center',
            href: 'https://github.com/johannesjo/super-productivity/blob/master/README.md#question-how-to-use-it',
          },
          {
            type: 'action',
            id: 'help-report',
            label: T.MH.HM.REPORT_A_PROBLEM,
            icon: 'bug_report',
            action: () => this._openBugReport(),
          },
          {
            type: 'href',
            id: 'help-contribute',
            label: T.MH.HM.CONTRIBUTE,
            icon: 'volunteer_activism',
            href: 'https://github.com/johannesjo/super-productivity/blob/master/CONTRIBUTING.md',
          },
          {
            type: 'href',
            id: 'help-reddit',
            label: T.MH.HM.REDDIT_COMMUNITY,
            icon: 'forum',
            href: 'https://www.reddit.com/r/superProductivity/',
          },
          {
            type: 'action',
            id: 'tour-welcome',
            label: T.MH.HM.START_WELCOME,
            icon: 'directions',
            action: () => this._startTour(TourId.Welcome),
          },
          {
            type: 'action',
            id: 'tour-keyboard',
            label: T.MH.HM.KEYBOARD,
            icon: 'directions',
            action: () => this._startTour(TourId.KeyboardNav),
          },
          {
            type: 'action',
            id: 'tour-sync',
            label: T.MH.HM.SYNC,
            icon: 'directions',
            action: () => this._startTour(TourId.Sync),
          },
          {
            type: 'action',
            id: 'tour-calendars',
            label: T.MH.HM.CALENDARS,
            icon: 'directions',
            action: () => this._startTour(TourId.IssueProviders),
          },
        ],
      },

      {
        type: 'route',
        id: 'settings',
        label: T.MH.SETTINGS,
        icon: 'settings',
        route: '/config',
        tourClass: 'tour-settingsMenuBtn',
      },
    ],
    fullModeByDefault: true,
    showLabels: true,
    mobileBreakpoint: 600,
    resizable: true,
    minWidth: 190,
    maxWidth: 400,
    defaultWidth: 260,
    collapseThreshold: 150,
    expandThreshold: 180,
  }));

  // Expose all drop zone ids (projects root + all folders) for DnD connectivity
  readonly allFolderDropListIds = computed<string[]>(() => {
    const folders = this._projectFolders();
    const ids: string[] = ['header-projects', 'list-projects'];
    for (const f of folders) {
      ids.push(`header-folder-${f.id}`, `list-folder-${f.id}`);
    }
    return ids;
  });

  // Simple action handler
  onNavItemClick(item: NavItem): void {
    switch (item.type) {
      case 'href':
        window.open(item.href, '_blank');
        break;
      case 'action':
        item.action?.();
        break;
      default:
        // Routes and groups handled elsewhere
        break;
    }
  }

  // Private helpers
  private _buildWorkContextItems(): NavItem[] {
    const items: NavItem[] = [];
    const mainContext = this._mainWorkContext();
    const inboxContext = this._inboxContext();

    if (mainContext) {
      items.push({
        type: 'workContext',
        id: `main-${mainContext.id}`,
        label: mainContext.title,
        icon: mainContext.icon || 'today',
        route: `/tag/${mainContext.id}/tasks`,
        workContext: mainContext,
        workContextType: WorkContextType.TAG,
        defaultIcon: 'today',
      });
    }

    if (inboxContext) {
      items.push({
        type: 'workContext',
        id: `inbox-${inboxContext.id}`,
        label: inboxContext.title,
        icon: inboxContext.icon || 'inbox',
        route: `/project/${inboxContext.id}/tasks`,
        workContext: inboxContext,
        workContextType: WorkContextType.PROJECT,
        defaultIcon: 'inbox',
      });
    }

    return items;
  }

  private _buildProjectItems(): NavItem[] {
    const projects = this._visibleProjects();
    const projectFolders = this._projectFolders();
    const rootLayout = this._rootProjectIds() ?? [];
    const activeId = this._activeWorkContextId();

    const items: NavItem[] = [];
    const folderMap = new Map(projectFolders.map((folder) => [folder.id, folder]));
    const processedFolders = new Set<string>();
    const processedProjects = new Set<string>();

    const appendProject = (projectId: string): void => {
      if (processedProjects.has(projectId)) {
        return;
      }
      const project = projects.find((p) => p.id === projectId);
      if (!project || project.folderId) {
        return;
      }
      if (!this._isProjectsExpanded() && activeId && project.id !== activeId) {
        return;
      }
      items.push({
        type: 'workContext',
        id: `project-${project.id}`,
        label: project.title,
        icon: project.icon || 'folder_special',
        route: `/project/${project.id}/tasks`,
        workContext: project,
        workContextType: WorkContextType.PROJECT,
        defaultIcon: project.icon || 'folder_special',
      });
      processedProjects.add(projectId);
    };

    const appendFolder = (folderId: string): void => {
      if (processedFolders.has(folderId)) {
        return;
      }
      const folder = folderMap.get(folderId);
      if (!folder || folder.parentId) {
        return;
      }
      const folderItems = this._buildProjectFolderItems(
        folder,
        projects,
        projectFolders,
        activeId,
      );
      items.push(...folderItems);
      processedFolders.add(folderId);
    };

    if (rootLayout.length) {
      for (const entry of rootLayout) {
        if (entry.startsWith('folder:')) {
          appendFolder(entry.slice('folder:'.length));
        } else if (entry.startsWith('project:')) {
          appendProject(entry.slice('project:'.length));
        } else {
          appendProject(entry);
        }
      }
    }

    // Fallback for any folders or projects missing from layout (e.g., newly created)
    projectFolders
      .filter((folder) => !folder.parentId && !processedFolders.has(folder.id))
      .forEach((folder) => appendFolder(folder.id));

    projects
      .filter((project) => !project.folderId && !processedProjects.has(project.id))
      .forEach((project) => appendProject(project.id));

    return items;
  }

  private _buildProjectFolderItems(
    folder: any,
    allProjects: any[],
    allFolders: any[],
    activeId: string | null,
  ): NavItem[] {
    const items: NavItem[] = [];

    // Get projects in this folder in the correct order
    const folderProjects =
      folder.projectIds
        ?.map((projectId) => allProjects.find((project) => project.id === projectId))
        .filter((project) => project !== undefined) || [];

    // Get sub-folders in this folder
    const subFolders = allFolders.filter((f) => f.parentId === folder.id);

    // If collapsed and no active items in this folder, skip it
    if (!this._isProjectsExpanded() && activeId) {
      const hasActiveProject = folderProjects.some((p) => p.id === activeId);
      const hasActiveSubFolder = subFolders.some((f) =>
        this._folderContainsActiveProject(f, allProjects, allFolders, activeId),
      );

      if (!hasActiveProject && !hasActiveSubFolder) {
        return [];
      }
    }

    // Collect items for this folder
    const folderChildren: NavItem[] = [];
    const subFolderNavItems: NavItem[] = [];

    // Prepare sub-folders recursively (appended after projects to keep order intuitive)
    for (const subFolder of subFolders) {
      const subFolderItems = this._buildProjectFolderItems(
        subFolder,
        allProjects,
        allFolders,
        activeId,
      );
      subFolderNavItems.push(...subFolderItems);
    }

    // Add projects in this folder
    let filteredProjects = folderProjects;
    if (!this._isProjectsExpanded() && activeId) {
      filteredProjects = folderProjects.filter((p) => p.id === activeId);
    }

    const projectItems = filteredProjects.map((project) => ({
      type: 'workContext' as const,
      id: `project-${project.id}`,
      label: project.title,
      icon: project.icon || 'folder_special',
      route: `/project/${project.id}/tasks`,
      workContext: project,
      workContextType: WorkContextType.PROJECT,
      defaultIcon: project.icon || 'folder_special',
    }));

    folderChildren.push(...projectItems);
    folderChildren.push(...subFolderNavItems);

    // Always add the folder (even if empty) to serve as a drop target
    items.push({
      type: 'group',
      id: folder.id,
      label: folder.title,
      icon: folder.isExpanded ? 'expand_more' : 'chevron_right',
      children: folderChildren,
      action: () => this._toggleFolderExpansion(folder.id),
      isFolder: true,
      folderId: folder.id,
    });

    return items;
  }

  private _folderContainsActiveProject(
    folder: any,
    allProjects: any[],
    allFolders: any[],
    activeId: string | null,
  ): boolean {
    // Check if any project in this folder is active
    const folderProjects = allProjects.filter((project) =>
      folder.projectIds?.includes(project.id),
    );
    if (folderProjects.some((p) => p.id === activeId)) {
      return true;
    }

    // Check sub-folders recursively
    const subFolders = allFolders.filter((f) => f.parentId === folder.id);
    return subFolders.some((f) =>
      this._folderContainsActiveProject(f, allProjects, allFolders, activeId),
    );
  }

  private _toggleFolderExpansion(folderId: string): void {
    this._projectFolderService.toggleFolderExpansion(folderId);
  }

  private _buildTagItems(): NavItem[] {
    const tags = this._tags();
    const activeId = this._activeWorkContextId();

    let filteredTags = tags;
    if (!this._isTagsExpanded() && activeId) {
      // Show only active tag when group is collapsed
      filteredTags = tags.filter((tag) => tag.id === activeId);
    }

    return filteredTags.map((tag) => ({
      type: 'workContext',
      id: `tag-${tag.id}`,
      label: tag.title,
      icon: tag.icon || 'label',
      route: `/tag/${tag.id}/tasks`,
      workContext: tag,
      workContextType: WorkContextType.TAG,
      defaultIcon: tag.icon || 'label',
    }));
  }

  private _buildPluginItems(): NavItem[] {
    const pluginEntries = this._pluginMenuEntries();

    return pluginEntries.map((entry) => ({
      type: 'plugin',
      id: `plugin-${entry.pluginId}-${entry.label}`,
      label: entry.label,
      icon: entry.icon || 'extension',
      pluginId: entry.pluginId,
      action: entry.onClick,
    }));
  }

  // Public computed signals for expansion state (for component to check)
  readonly isProjectsExpanded = computed(() => this._isProjectsExpanded());
  readonly isTagsExpanded = computed(() => this._isTagsExpanded());

  // Public access to projects for visibility menu
  readonly allProjectsExceptInbox = computed(() => this._allProjectsExceptInbox());

  // Check if there are any projects or tags (for empty state)
  readonly hasAnyProjects = computed(() => this._visibleProjects().length > 0);
  readonly hasAnyTags = computed(() => this._tags().length > 0);

  // Simple toggle functions
  private _toggleProjectsExpanded(): void {
    const newState = !this._isProjectsExpanded();
    this._isProjectsExpanded.set(newState);
    lsSetItem(LS.IS_PROJECT_LIST_EXPANDED, newState);
  }

  private _toggleTagsExpanded(): void {
    const newState = !this._isTagsExpanded();
    this._isTagsExpanded.set(newState);
    lsSetItem(LS.IS_TAG_LIST_EXPANDED, newState);
  }

  // Simple action handlers
  private _openCreateProject(): void {
    this._matDialog.open(DialogCreateProjectComponent, { restoreFocus: true });
  }

  private _openCreateProjectFolder(): void {
    this._matDialog.open(DialogCreateEditProjectFolderComponent, {
      restoreFocus: true,
    });
  }

  private _createNewTag(): void {
    this._matDialog
      .open(DialogPromptComponent, {
        data: {
          placeholder: T.F.TAG.TTL.ADD_NEW_TAG,
        },
      })
      .afterClosed()
      .subscribe((title) => {
        if (title && title.trim()) {
          this._tagService.addTag({ title: title.trim() });
        }
      });
  }

  private _openBugReport(): void {
    window.open(getGithubErrorUrl('', undefined, true), '_blank');
  }

  private _startTour(tourId: TourId): void {
    void this._shepherdService.show(tourId);
  }

  private _openProjectVisibilityMenu(): void {
    // Project visibility is handled by the nav-list component's additional buttons
    // This method is called but the actual menu is rendered in the template
  }

  toggleProjectVisibility(projectId: string): void {
    this._store.dispatch(toggleHideFromMenu({ id: projectId }));
  }

  // Public methods for empty states
  createNewProject(): void {
    this._openCreateProject();
  }

  createNewTag(): void {
    this._createNewTag();
  }

  // Drag and drop handlers
  async handleProjectDrop(
    items: NavWorkContextItem[],
    event: CdkDragDrop<string, string, NavWorkContextItem>,
  ): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;

    // Create a copy of the array and move the item
    const reorderedItems = [...items];
    moveItemInArray(reorderedItems, event.previousIndex, event.currentIndex);

    // Only proceed with reordering if we're dealing with root-level projects
    // For folder-level reordering, we don't need to update the global project order
    const isRootLevelReordering = items.every(
      (item) => item.workContext && !(item.workContext as any).folderId,
    );

    if (!isRootLevelReordering) {
      // Reordering within a folder doesn't affect the global project order
      return;
    }

    // New order (root-level visible projects only) from the drag result
    const reorderedRootVisibleIds = reorderedItems.map((item) => item.workContext!.id);

    // Build the full visible-unarchived order across ALL projects (root + inside folders)
    const visibleProjectsAll = this._visibleProjects();
    if (!visibleProjectsAll || visibleProjectsAll.length === 0) {
      return;
    }

    // Reconstruct the global visible order by replacing only the root-level segment
    const rootQueue = [...reorderedRootVisibleIds];
    const fullVisibleIds = visibleProjectsAll.map((p) =>
      p.folderId ? p.id : rootQueue.shift()!,
    );

    // Submit only the full visible-unarchived ids. Reducer appends archived + hidden.
    this._projectService.updateOrder(fullVisibleIds);
  }

  handleTagDrop(
    items: NavWorkContextItem[],
    event: CdkDragDrop<string, string, NavWorkContextItem>,
  ): void {
    if (event.previousIndex === event.currentIndex) return;

    // Create a copy of the array and move the item
    const reorderedItems = [...items];
    moveItemInArray(reorderedItems, event.previousIndex, event.currentIndex);

    // Get the new order of IDs
    const visibleIds = reorderedItems.map((item) => item.workContext!.id);

    // Special today list should always be first, so prepend it
    const newIds = [TODAY_TAG.id, ...visibleIds.filter((id) => id !== TODAY_TAG.id)];
    this._tagService.updateOrder(newIds);
  }

  handleFolderDrop(event: CdkDragDrop<any, any, any>): void {
    const draggedItem = event.item.data;
    const targetContainer = event.container.data;
    const sourceContainer = event.previousContainer.data;

    // Handle project being moved between containers
    if (
      draggedItem.type === 'workContext' &&
      draggedItem.workContextType === WorkContextType.PROJECT
    ) {
      this._handleProjectFolderMove(draggedItem, sourceContainer, targetContainer);
    }
    // Handle folder reordering (if needed in the future)
    else if (draggedItem.type === 'group' && (draggedItem as any).isFolder) {
      // For now, we don't support folder reordering, but this is where it would go
    }
  }

  handleProjectMove(
    projectId: string,
    targetFolderId: string | null,
    targetIndex?: number,
  ): void {
    // Get current state before making any changes
    const allProjects = this._visibleProjects();
    if (!allProjects || allProjects.length === 0) {
      return;
    }

    // Find the source project
    const sourceProject = allProjects.find((p) => p.id === projectId);
    if (!sourceProject) {
      return;
    }

    // Check if we're reordering within the same folder
    const isReorderingWithinSameFolder = sourceProject?.folderId === targetFolderId;

    if (isReorderingWithinSameFolder && typeof targetIndex === 'number') {
      // For same-folder reordering, we need to update the global order to reflect
      // the new position within the folder while maintaining all other project positions
      // Get all projects in the target folder (excluding the moved project)
      const folderProjects = allProjects.filter(
        (p) => p.folderId === targetFolderId && p.id !== projectId,
      );

      // Create the new order for this folder by inserting the moved project at targetIndex
      const newFolderOrder = [...folderProjects];
      const clampedIndex = Math.max(0, Math.min(targetIndex, newFolderOrder.length));
      newFolderOrder.splice(clampedIndex, 0, sourceProject);

      // Now rebuild the full global order by replacing the folder segment
      const result: string[] = [];
      let folderSegmentInserted = false;

      for (const p of allProjects) {
        if (p.folderId === targetFolderId) {
          // Insert the reordered folder segment once
          if (!folderSegmentInserted) {
            result.push(...newFolderOrder.map((fp) => fp.id));
            folderSegmentInserted = true;
          }
          // Skip individual folder items as they're already in newFolderOrder
          continue;
        }

        // Skip the moved project if it appears elsewhere (it shouldn't, but safety)
        if (p.id === projectId) {
          continue;
        }

        result.push(p.id);
      }

      // If folder was empty before, add the folder segment
      if (!folderSegmentInserted) {
        result.push(projectId);
      }

      this._projectService.updateOrder(result);
      return;
    }

    // For cross-folder moves or moves to/from root level, use the existing logic
    const getProjectsInFolder = (folderId: string | null): string[] =>
      allProjects
        .filter((p) => (folderId ? p.folderId === folderId : !p.folderId))
        .map((p) => p.id);

    const targetIds = getProjectsInFolder(targetFolderId).filter(
      (id) => id !== projectId,
    );

    // Calculate the correct index
    const clampedIndex =
      typeof targetIndex === 'number'
        ? Math.max(0, Math.min(targetIndex, targetIds.length))
        : targetIds.length; // append by default

    // Create the new order for the target folder
    const newTargetIds = [
      ...targetIds.slice(0, clampedIndex),
      projectId,
      ...targetIds.slice(clampedIndex),
    ];

    // Now update the folder assignment
    this._projectService.update(projectId, { folderId: targetFolderId });

    // Build the final order by reconstructing the full list
    const result: string[] = [];
    let insertedTargetSegment = false;

    // Go through all projects and rebuild the order
    for (const p of allProjects) {
      const projectFolderId = p.id === projectId ? targetFolderId : p.folderId;
      const isInTargetFolder = targetFolderId
        ? projectFolderId === targetFolderId
        : !projectFolderId;

      if (isInTargetFolder) {
        // Insert the reordered target segment once
        if (!insertedTargetSegment) {
          result.push(...newTargetIds);
          insertedTargetSegment = true;
        }
        // Skip individual items from target folder as they're already in newTargetIds
        continue;
      }

      // Skip the moved project if it appears elsewhere
      if (p.id === projectId) {
        continue;
      }

      result.push(p.id);
    }

    // If target folder was empty, insert the target segment
    if (!insertedTargetSegment) {
      result.push(...newTargetIds);
    }

    this._projectService.updateOrder(result);
  }

  handleFolderMove(
    folderId: string,
    targetParentFolderId: string | null,
    targetIndex?: number,
  ): void {
    // Validate the move to prevent circular dependencies and invalid nesting
    if (!this._isValidFolderMove(folderId, targetParentFolderId)) {
      console.warn(
        'Invalid folder move - would create circular dependency or invalid nesting',
      );
      return;
    }

    const allFolders = this._projectFolders();
    if (!allFolders) {
      return;
    }

    // Compute new global folder id order while reordering only the relevant sibling segment
    const currentIds = allFolders.map((f) => f.id);
    const withoutMoved = currentIds.filter((id) => id !== folderId);

    const siblingIds = allFolders
      .filter(
        (f) =>
          f.id !== folderId && (f.parentId || null) === (targetParentFolderId || null),
      )
      .map((f) => f.id);

    const clampedIndex = Math.max(
      0,
      Math.min(
        typeof targetIndex === 'number' ? targetIndex : siblingIds.length,
        siblingIds.length,
      ),
    );

    // Determine insertion reference
    const pivotId = siblingIds[clampedIndex] ?? null;

    // Find insertion position in global list
    let insertAt = -1;
    if (pivotId) {
      insertAt = withoutMoved.indexOf(pivotId);
    } else if (siblingIds.length > 0) {
      const lastSiblingId = siblingIds[siblingIds.length - 1];
      const lastIdx = withoutMoved.indexOf(lastSiblingId);
      insertAt = lastIdx + 1;
    } else {
      // No siblings → append at end
      insertAt = withoutMoved.length;
    }

    const newIds = [
      ...withoutMoved.slice(0, insertAt),
      folderId,
      ...withoutMoved.slice(insertAt),
    ];

    // First update the parent assignment
    this._projectFolderService.updateProjectFolder(folderId, {
      parentId: targetParentFolderId,
    });
    // Then update the folder order to reflect new sibling placement
    this._projectFolderService.updateOrder(newIds);
  }

  private _isValidFolderMove(
    folderId: string,
    targetParentFolderId: string | null,
  ): boolean {
    // Can't move a folder into itself
    if (folderId === targetParentFolderId) {
      return false;
    }

    // If moving to root level, it's always valid
    if (!targetParentFolderId) {
      return true;
    }

    // Get all folders to check for circular dependencies
    const allFolders = this._projectFolders();

    // Find the target parent folder
    const targetParent = allFolders.find((f) => f.id === targetParentFolderId);
    if (!targetParent) {
      return false; // Target parent doesn't exist
    }

    // Check if target parent already has a parent (would create nesting deeper than 1 level)
    if (targetParent.parentId) {
      return false; // Would create nesting deeper than 1 level
    }

    // Check if the folder being moved has children that would become too deeply nested
    const folderHasChildren = allFolders.some((f) => f.parentId === folderId);
    if (folderHasChildren && targetParentFolderId) {
      return false; // Would create nesting deeper than 1 level (grandchildren)
    }

    return true;
  }

  private _handleProjectFolderMove(
    projectItem: NavWorkContextItem,
    sourceContainer: any,
    targetContainer: any,
  ): void {
    const projectId = projectItem.workContext?.id;
    if (!projectId) return;

    let targetFolderId: string | null = null;

    // Determine target folder ID
    if (targetContainer?.isFolder && targetContainer?.folderId) {
      targetFolderId = targetContainer.folderId;
    } else if (
      typeof targetContainer?.id === 'string' &&
      targetContainer.id?.startsWith?.('folder-')
    ) {
      // Fallback for legacy id format, if still present
      targetFolderId = targetContainer.id.replace('folder-', '');
    } else if (targetContainer?.id === 'projects') {
      targetFolderId = null; // Moving to root level
    }

    // Update the project's folder assignment
    this._projectService.update(projectId, { folderId: targetFolderId });
  }

  // Helper
  private _getStoredBooleanState(key: string): boolean {
    const stored = localStorage.getItem(key);
    return stored === null || stored === 'true';
  }
}
