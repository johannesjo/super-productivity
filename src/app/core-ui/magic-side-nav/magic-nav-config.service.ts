import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';

import { WorkContextType } from '../../features/work-context/work-context.model';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { TagService } from '../../features/tag/tag.service';
import { ShepherdService } from '../../features/shepherd/shepherd.service';
import { TourId } from '../../features/shepherd/shepherd-steps.const';
import { T } from '../../t.const';
import { LS } from '../../core/persistence/storage-keys.const';
import { DialogCreateProjectComponent } from '../../features/project/dialogs/create-project/dialog-create-project.component';
import { getGithubErrorUrl } from '../../core/error-handler/global-error-handler.util';
import { DialogPromptComponent } from '../../ui/dialog-prompt/dialog-prompt.component';
import {
  selectAllProjectsExceptInbox,
  selectUnarchivedVisibleProjects,
} from '../../features/project/store/project.selectors';
import { toggleHideFromMenu } from '../../features/project/store/project.actions';
import { NavConfig, NavItem } from './magic-side-nav.model';
import { PluginBridgeService } from '../../plugins/plugin-bridge.service';
import { lsGetBoolean, lsSetItem } from '../../util/ls-util';
import { MenuTreeService } from '../../features/menu-tree/menu-tree.service';
import {
  MenuTreeKind,
  MenuTreeViewNode,
} from '../../features/menu-tree/store/menu-tree.model';

@Injectable({
  providedIn: 'root',
})
export class MagicNavConfigService {
  private readonly _workContextService = inject(WorkContextService);
  private readonly _tagService = inject(TagService);
  private readonly _shepherdService = inject(ShepherdService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _store = inject(Store);
  private readonly _pluginBridge = inject(PluginBridgeService);
  private readonly _menuTreeService = inject(MenuTreeService);

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

  private readonly _allProjectsExceptInbox = toSignal(
    this._store.select(selectAllProjectsExceptInbox),
    { initialValue: [] },
  );
  private readonly _tags = toSignal(this._tagService.tagsNoMyDayAndNoList$, {
    initialValue: [],
  });
  private readonly _projectNavTree = computed<MenuTreeViewNode[]>(() =>
    this._menuTreeService.buildProjectViewTree(this._visibleProjects()),
  );
  private readonly _tagNavTree = computed<MenuTreeViewNode[]>(() =>
    this._menuTreeService.buildTagViewTree(this._tags()),
  );
  private readonly _pluginMenuEntries = this._pluginBridge.menuEntries;

  constructor() {
    // TODO these should probably live in the _menuTreeService
    effect(() => {
      const projects = this._visibleProjects();
      if (projects.length && !this._menuTreeService.hasProjectTree()) {
        this._menuTreeService.initializeProjectTree(projects);
      }
    });

    // TODO these should probably live in the _menuTreeService
    effect(() => {
      const tags = this._tags();
      if (tags.length && !this._menuTreeService.hasTagTree()) {
        this._menuTreeService.initializeTagTree(tags);
      }
    });
  }

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
        type: 'tree',
        id: 'projects',
        label: T.MH.PROJECTS,
        icon: 'expand_more',
        treeKind: MenuTreeKind.PROJECT,
        tree:
          this._projectNavTree().length > 0
            ? this._projectNavTree()
            : this._visibleProjects().map((project) => ({
                k: MenuTreeKind.PROJECT,
                project,
              })),
        action: () => this._toggleProjectsExpanded(),
        additionalButtons: [
          {
            id: 'project-visibility',
            icon: 'visibility',
            tooltip: T.F.PROJECT_FOLDER.TOOLTIP_VISIBILITY,
            action: () => this._openProjectVisibilityMenu(),
          },
          {
            id: 'add-project-folder',
            icon: 'create_new_folder',
            tooltip: T.F.PROJECT_FOLDER.TOOLTIP_CREATE,
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
        type: 'tree',
        id: 'tags',
        label: T.MH.TAGS,
        icon: 'expand_more',
        treeKind: MenuTreeKind.TAG,
        tree:
          this._tagNavTree().length > 0
            ? this._tagNavTree()
            : this._tags().map((tag) => ({
                k: MenuTreeKind.TAG,
                tag,
              })),
        action: () => this._toggleTagsExpanded(),
        additionalButtons: [
          {
            id: 'add-tag-folder',
            icon: 'create_new_folder',
            tooltip: T.F.TAG_FOLDER.TOOLTIP_CREATE,
            action: () => this._openCreateTagFolder(),
          },
          {
            id: 'add-tag',
            icon: 'add',
            tooltip: T.MH.CREATE_TAG,
            action: () => this._createNewTag(),
          },
        ],
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

  private _buildPluginItems(): NavItem[] {
    const pluginEntries = this._pluginMenuEntries();

    return pluginEntries.map((entry) => {
      const hasSvgIcon = /\.svg$/i.test(entry.icon || '');
      return {
        type: 'plugin',
        id: `plugin-${entry.pluginId}-${entry.label}`,
        label: entry.label,
        icon: entry.icon || 'extension',
        ...(hasSvgIcon && {
          svgIcon: `assets/bundled-plugins/${entry.pluginId}/${entry.icon}`,
        }),
        pluginId: entry.pluginId,
        action: entry.onClick,
      };
    });
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
    this._matDialog
      .open(DialogPromptComponent, {
        restoreFocus: true,
        data: {
          placeholder: T.F.PROJECT_FOLDER.DIALOG.NAME_PLACEHOLDER,
        },
      })
      .afterClosed()
      .subscribe((title) => {
        if (!title) {
          return;
        }
        const trimmed = title.trim();
        if (!trimmed) {
          return;
        }
        this._menuTreeService.createProjectFolder(trimmed);
      });
  }

  private _openCreateTagFolder(): void {
    this._matDialog
      .open(DialogPromptComponent, {
        restoreFocus: true,
        data: {
          placeholder: T.F.TAG_FOLDER.DIALOG.NAME_PLACEHOLDER,
        },
      })
      .afterClosed()
      .subscribe((title) => {
        if (!title) {
          return;
        }
        const trimmed = title.trim();
        if (!trimmed) {
          return;
        }
        this._menuTreeService.createTagFolder(trimmed);
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
}
