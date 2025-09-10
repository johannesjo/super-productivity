import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { first } from 'rxjs/operators';

import { WorkContextType } from '../../features/work-context/work-context.model';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { TagService } from '../../features/tag/tag.service';
import { ProjectService } from '../../features/project/project.service';
import { ShepherdService } from '../../features/shepherd/shepherd.service';
import { TourId } from '../../features/shepherd/shepherd-steps.const';
import { T } from '../../t.const';
import { LS } from '../../core/persistence/storage-keys.const';
import { DialogCreateProjectComponent } from '../../features/project/dialogs/create-project/dialog-create-project.component';
import { getGithubErrorUrl } from '../../core/error-handler/global-error-handler.util';
import {
  selectAllProjectsExceptInbox,
  selectUnarchivedHiddenProjectIds,
  selectUnarchivedVisibleProjects,
} from '../../features/project/store/project.selectors';
import { toggleHideFromMenu } from '../../features/project/store/project.actions';
import { NavConfig, NavItem, NavWorkContextItem } from './magic-side-nav.model';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { PluginBridgeService } from '../../plugins/plugin-bridge.service';

@Injectable({
  providedIn: 'root',
})
export class MagicNavConfigService {
  private readonly _workContextService = inject(WorkContextService);
  private readonly _tagService = inject(TagService);
  private readonly _projectService = inject(ProjectService);
  private readonly _shepherdService = inject(ShepherdService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _store = inject(Store);
  private readonly _pluginBridge = inject(PluginBridgeService);

  // Simple state signals
  private readonly _isProjectsExpanded = signal(
    this._getStoredState(LS.IS_PROJECT_LIST_EXPANDED),
  );
  private readonly _isTagsExpanded = signal(
    this._getStoredState(LS.IS_TAG_LIST_EXPANDED),
  );

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
    position: 'left',
    theme: 'light',
    resizable: true,
    minWidth: 190,
    maxWidth: 400,
    defaultWidth: 260,
    collapseThreshold: 150,
    expandThreshold: 180,
  }));

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
    const activeId = this._activeWorkContextId();

    let filteredProjects = projects;
    if (!this._isProjectsExpanded() && activeId) {
      // Show only active project when group is collapsed
      filteredProjects = projects.filter((project) => project.id === activeId);
    }

    return filteredProjects.map((project) => ({
      type: 'workContext',
      id: `project-${project.id}`,
      label: project.title,
      icon: project.icon || 'folder_special',
      route: `/project/${project.id}/tasks`,
      workContext: project,
      workContextType: WorkContextType.PROJECT,
      defaultIcon: project.icon || 'folder_special',
    }));
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
    localStorage.setItem(LS.IS_PROJECT_LIST_EXPANDED, newState.toString());
  }

  private _toggleTagsExpanded(): void {
    const newState = !this._isTagsExpanded();
    this._isTagsExpanded.set(newState);
    localStorage.setItem(LS.IS_TAG_LIST_EXPANDED, newState.toString());
  }

  // Simple action handlers
  private _openCreateProject(): void {
    this._matDialog.open(DialogCreateProjectComponent, { restoreFocus: true });
  }

  private _createNewTag(): void {
    const title = prompt('Enter tag name:');
    if (title && title.trim()) {
      this._tagService.addTag({ title: title.trim() });
    }
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

    // Get the new order of IDs
    const visibleIds = reorderedItems.map((item) => item.workContext!.id);

    // Get hidden project IDs to append at the end
    const hiddenIds = await this._store
      .select(selectUnarchivedHiddenProjectIds)
      .pipe(first())
      .toPromise();

    // Combine visible and hidden IDs
    const newIds = [...visibleIds, ...(hiddenIds || [])];
    this._projectService.updateOrder(newIds);
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

  // Helper
  private _getStoredState(key: string): boolean {
    const stored = localStorage.getItem(key);
    return stored === null || stored === 'true';
  }
}
