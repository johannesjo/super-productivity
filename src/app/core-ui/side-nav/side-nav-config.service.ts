import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { NavConfig, NavItem } from '../magic-side-nav/magic-side-nav';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { ProjectService } from '../../features/project/project.service';
import { TagService } from '../../features/tag/tag.service';
import { TaskService } from '../../features/tasks/task.service';
import { ShepherdService } from '../../features/shepherd/shepherd.service';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { TourId } from '../../features/shepherd/shepherd-steps.const';
import { T } from '../../t.const';
import { LS } from '../../core/persistence/storage-keys.const';
import { DialogCreateProjectComponent } from '../../features/project/dialogs/create-project/dialog-create-project.component';
import { getGithubErrorUrl } from '../../core/error-handler/global-error-handler.util';
import { selectUnarchivedVisibleProjects } from '../../features/project/store/project.selectors';
import { toggleHideFromMenu } from '../../features/project/store/project.actions';

interface TaskCounts {
  mainContext: number;
  inboxContext: number;
}

@Injectable({
  providedIn: 'root',
})
export class SideNavConfigService {
  private readonly _workContextService = inject(WorkContextService);
  private readonly _projectService = inject(ProjectService);
  private readonly _tagService = inject(TagService);
  private readonly _taskService = inject(TaskService);
  private readonly _shepherdService = inject(ShepherdService);
  private readonly _globalConfigService = inject(GlobalConfigService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _store = inject(Store);
  private readonly _router = inject(Router);

  // State signals
  private readonly _isProjectsExpanded = signal(this._fetchProjectListState());
  private readonly _isTagsExpanded = signal(this._fetchTagListState());

  // Data signals
  private readonly _mainWorkContext = toSignal(
    this._workContextService.mainWorkContext$,
    { initialValue: null },
  );
  private readonly _inboxContext = toSignal(this._workContextService.inboxWorkContext$, {
    initialValue: null,
  });
  private readonly _activeWorkContextId = toSignal(
    this._workContextService.activeWorkContextId$,
    { initialValue: null },
  );
  private readonly _allVisibleProjects = toSignal(
    this._store.select(selectUnarchivedVisibleProjects),
    { initialValue: [] },
  );
  private readonly _tagList = toSignal(this._tagService.tagsNoMyDayAndNoList$, {
    initialValue: [],
  });

  // Task counts for badges
  private readonly _taskCounts = toSignal(
    combineLatest([
      this._workContextService.mainWorkContext$,
      this._workContextService.inboxWorkContext$,
    ]).pipe(
      map(
        ([mainContext, inboxContext]): TaskCounts => ({
          mainContext: mainContext?.taskIds?.length || 0,
          inboxContext: inboxContext?.taskIds?.length || 0,
        }),
      ),
    ),
    { initialValue: { mainContext: 0, inboxContext: 0 } as TaskCounts },
  );

  // Computed navigation config
  readonly navConfig = computed<NavConfig>(() => {
    const items = this._buildNavItems();
    return {
      items,
      expandedByDefault: true,
      showLabels: true,
      mobileBreakpoint: 768,
      position: 'left',
      theme: 'light',
      resizable: true,
      minWidth: 200,
      maxWidth: 400,
      defaultWidth: 260,
      collapseThreshold: 150,
      expandThreshold: 180,
    };
  });

  private _buildNavItems(): NavItem[] {
    const items: NavItem[] = [];

    // Main context items
    this._addMainContextItems(items);

    // Separator after main context
    this._addSeparator(items, 'separator-1');

    // Main navigation routes
    this._addMainRouteItems(items);

    // Separator after main routes
    this._addSeparator(items, 'separator-2');

    // Projects section
    this._addProjectsSection(items);

    // Tags section
    this._addTagsSection(items);

    // Separator before app section
    this._addSeparator(items, 'separator-3');

    // App section (search, planned, help, settings)
    this._addAppSection(items);

    return items;
  }

  private _addMainContextItems(items: NavItem[]): void {
    const mainContext = this._mainWorkContext();
    const inboxContext = this._inboxContext();
    const taskCounts = this._taskCounts();

    // Add Today context using side-nav-item component
    if (mainContext) {
      items.push({
        id: `main-${mainContext.id}`,
        label: mainContext.title,
        icon: mainContext.icon || 'inbox',
        route: `/tag/${mainContext.id}/tasks`,
        badge: taskCounts.mainContext > 0 ? taskCounts.mainContext.toString() : undefined,
        // Work context data for side-nav-item component
        workContext: mainContext,
        workContextType: WorkContextType.TAG,
        defaultIcon: mainContext.icon || 'inbox',
      });
    }

    // Add Inbox context using side-nav-item component
    if (inboxContext) {
      items.push({
        id: `inbox-${inboxContext.id}`,
        label: inboxContext.title,
        icon: inboxContext.icon || 'inbox',
        route: `/project/${inboxContext.id}/tasks`,
        badge:
          taskCounts.inboxContext > 0 ? taskCounts.inboxContext.toString() : undefined,
        // Work context data for side-nav-item component
        workContext: inboxContext,
        workContextType: WorkContextType.PROJECT,
        defaultIcon: inboxContext.icon || 'inbox',
      });
    }
  }

  private _addMainRouteItems(items: NavItem[]): void {
    items.push(
      {
        id: 'schedule',
        label: T.MH.SCHEDULE,
        icon: 'early_on', // Keep icon as fallback
        svgIcon: 'early_on', // Use SVG icon
        route: '/schedule',
      },
      {
        id: 'planner',
        label: T.MH.PLANNER,
        icon: 'edit_calendar',
        route: '/planner',
      },
      {
        id: 'boards',
        label: T.MH.BOARDS,
        icon: 'grid_view',
        route: '/boards',
      },
    );
  }

  private _addProjectsSection(items: NavItem[]): void {
    const projects = this._allVisibleProjects();
    const allNonInboxProjects = projects || [];

    // Always provide all projects - let the magic-side-nav handle visibility
    const projectChildren: NavItem[] = allNonInboxProjects.map((project) => ({
      id: `project-${project.id}`,
      label: project.title,
      icon: project.icon || 'folder_special',
      route: `/project/${project.id}/tasks`,
      badge: project.taskIds?.length > 0 ? project.taskIds.length.toString() : undefined,
      // Work context data for side-nav-item component
      workContext: project,
      workContextType: WorkContextType.PROJECT,
      defaultIcon: 'folder_special',
    }));

    // Context menu items for project visibility
    const contextMenuItems: NavItem[] = allNonInboxProjects.map((project) => ({
      id: `toggle-visibility-${project.id}`,
      label: project.title,
      icon: (project as any).isHiddenFromMenu ? 'visibility_off' : 'visibility',
      action: () => this._toggleProjectVisibility(project),
    }));

    // Always show the projects section, even if empty
    items.push({
      id: 'projects',
      label: T.MH.PROJECTS,
      icon: 'expand_more',
      children: projectChildren,
      action: () => this._toggleProjectsExpansion(),
      additionalButtons: [
        {
          id: 'project-visibility',
          icon: 'visibility_off',
          tooltip: 'Toggle project visibility',
          hidden: allNonInboxProjects.length === 0,
          contextMenu: contextMenuItems,
        },
        {
          id: 'add-project',
          icon: 'add',
          tooltip: T.MH.CREATE_PROJECT,
          action: () => this.addProject(),
        },
      ],
      contextMenuItems,
    });
  }

  private _addTagsSection(items: NavItem[]): void {
    const tags = this._tagList();

    // Always provide all tags - let the magic-side-nav handle visibility
    const tagChildren: NavItem[] = (tags || []).map((tag) => ({
      id: `tag-${tag.id}`,
      label: tag.title,
      icon: tag.icon || 'label',
      route: `/tag/${tag.id}/tasks`,
      badge: tag.taskIds?.length > 0 ? tag.taskIds.length.toString() : undefined,
      // Work context data for side-nav-item component
      workContext: tag,
      workContextType: WorkContextType.TAG,
      defaultIcon: 'label',
    }));

    // Always show the tags section, even if empty
    items.push({
      id: 'tags',
      label: T.MH.TAGS,
      icon: 'expand_more',
      children: tagChildren,
      action: () => this._toggleTagsExpansion(),
      // Tags don't have additional buttons like projects do
    });
  }

  private _addAppSection(items: NavItem[]): void {
    items.push(
      {
        id: 'search',
        label: T.MH.SEARCH,
        icon: 'search',
        route: '/search',
      },
      {
        id: 'scheduled-list',
        label: T.MH.ALL_PLANNED_LIST,
        icon: 'list',
        route: '/scheduled-list',
      },
      {
        id: 'help',
        label: T.MH.HELP,
        icon: 'help_center',
        children: [
          {
            id: 'help-online',
            label: T.MH.HM.GET_HELP_ONLINE,
            icon: 'help_center',
            action: () => this._openHelp(),
          },
          {
            id: 'help-report',
            label: T.MH.HM.REPORT_A_PROBLEM,
            icon: 'bug_report',
            action: () => this._reportProblem(),
          },
          {
            id: 'help-contribute',
            label: T.MH.HM.CONTRIBUTE,
            icon: 'volunteer_activism',
            action: () => this._openContribute(),
          },
          {
            id: 'help-reddit',
            label: T.MH.HM.REDDIT_COMMUNITY,
            icon: 'forum',
            action: () => this._openReddit(),
          },
          {
            id: 'help-tour-welcome',
            label: T.MH.HM.START_WELCOME,
            icon: 'directions',
            action: () => this._startTour(TourId.Welcome),
          },
          {
            id: 'help-tour-keyboard',
            label: T.MH.HM.KEYBOARD,
            icon: 'directions',
            action: () => this._startTour(TourId.KeyboardNav),
          },
          {
            id: 'help-tour-sync',
            label: T.MH.HM.SYNC,
            icon: 'directions',
            action: () => this._startTour(TourId.Sync),
          },
          {
            id: 'help-tour-calendars',
            label: T.MH.HM.CALENDARS,
            icon: 'directions',
            action: () => this._startTour(TourId.IssueProviders),
          },
        ],
      },
      {
        id: 'settings',
        label: T.MH.SETTINGS,
        icon: 'settings',
        route: '/config',
      },
    );
  }

  // Action handlers
  private _toggleProjectsExpansion(): void {
    const newState = !this._isProjectsExpanded();
    this._isProjectsExpanded.set(newState);
    localStorage.setItem(LS.IS_PROJECT_LIST_EXPANDED, newState.toString());
  }

  private _toggleTagsExpansion(): void {
    const newState = !this._isTagsExpanded();
    this._isTagsExpanded.set(newState);
    localStorage.setItem(LS.IS_TAG_LIST_EXPANDED, newState.toString());
  }

  addProject(): void {
    this._matDialog.open(DialogCreateProjectComponent, {
      restoreFocus: true,
    });
  }

  private _toggleProjectVisibility(project: any): void {
    this._store.dispatch(toggleHideFromMenu({ id: project.id }));
  }

  private _startTour(tourId: TourId): void {
    this._shepherdService.show(tourId);
  }

  private _openHelp(): void {
    window.open(
      'https://github.com/johannesjo/super-productivity/blob/master/README.md#question-how-to-use-it',
      '_blank',
    );
  }

  private _reportProblem(): void {
    const url = getGithubErrorUrl('', undefined, true);
    window.open(url, '_blank');
  }

  private _openContribute(): void {
    window.open(
      'https://github.com/johannesjo/super-productivity/blob/master/CONTRIBUTING.md',
      '_blank',
    );
  }

  private _openReddit(): void {
    window.open('https://www.reddit.com/r/superProductivity/', '_blank');
  }

  // State helpers
  private _fetchProjectListState(): boolean {
    const stored = localStorage.getItem(LS.IS_PROJECT_LIST_EXPANDED);
    // Default to true if not set, or if set to 'true'
    return stored === null || stored === 'true';
  }

  private _fetchTagListState(): boolean {
    const stored = localStorage.getItem(LS.IS_TAG_LIST_EXPANDED);
    // Default to true if not set, or if set to 'true'
    return stored === null || stored === 'true';
  }

  private _addSeparator(items: NavItem[], id: string): void {
    items.push({
      id,
      label: '',
      icon: '',
      action: () => {}, // No-op action for separators
    });
  }

  // Public methods for external use
  onNavItemClick(item: NavItem): void {
    if (item.action) {
      item.action();
    } else if (item.route) {
      this._router.navigate([item.route]);
    }
  }

  // Getter for expansion states
  get isProjectsExpanded(): boolean {
    return this._isProjectsExpanded();
  }

  get isTagsExpanded(): boolean {
    return this._isTagsExpanded();
  }

  // Computed signal for expanded group IDs
  readonly expandedGroupIds = computed(() => {
    const expandedIds = new Set<string>();
    if (this._isProjectsExpanded()) {
      expandedIds.add('projects');
    }
    if (this._isTagsExpanded()) {
      expandedIds.add('tags');
    }
    return expandedIds;
  });
}
