import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  signal,
  untracked,
} from '@angular/core';
import { TaskDetailTargetPanel, TaskWithSubTasks } from '../tasks/task.model';
import { filter, map, startWith } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { slideInFromTopAni } from '../../ui/animations/slide-in-from-top.ani';
import { slideInFromRightAni } from '../../ui/animations/slide-in-from-right.ani';
import { taskDetailPanelTaskChangeAnimation } from '../tasks/task-detail-panel/task-detail-panel.ani';
import { BetterDrawerContainerComponent } from '../../ui/better-drawer/better-drawer-container/better-drawer-container.component';
import { IssuePanelComponent } from '../issue-panel/issue-panel.component';
import { NotesComponent } from '../note/notes/notes.component';
import { TaskDetailPanelComponent } from '../tasks/task-detail-panel/task-detail-panel.component';
import { TaskViewCustomizerPanelComponent } from '../task-view-customizer/task-view-customizer-panel/task-view-customizer-panel.component';
import { PluginService } from '../../plugins/plugin.service';
import { PluginPanelContainerComponent } from '../../plugins/ui/plugin-panel-container/plugin-panel-container.component';
import { Store } from '@ngrx/store';
import {
  INITIAL_LAYOUT_STATE,
  selectActivePluginId,
  selectIsShowPluginPanel,
  selectLayoutFeatureState,
} from '../../core-ui/layout/store/layout.reducer';
import { hidePluginPanel } from '../../core-ui/layout/store/layout.actions';
import { Log } from '../../core/log';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    taskDetailPanelTaskChangeAnimation,
    slideInFromTopAni,
    slideInFromRightAni,
  ],
  imports: [
    BetterDrawerContainerComponent,
    IssuePanelComponent,
    NotesComponent,
    TaskDetailPanelComponent,
    TaskViewCustomizerPanelComponent,
    PluginPanelContainerComponent,
  ],
})
export class RightPanelComponent implements OnDestroy {
  taskService = inject(TaskService);
  layoutService = inject(LayoutService);
  pluginService = inject(PluginService);
  store = inject(Store);
  private _router = inject(Router);

  // NOTE: used for debugging
  readonly isAlwaysOver = input<boolean>(false);

  // Determines if the panel should be in overlay mode based on route and screen size
  readonly isOverlayMode = computed(() => {
    // Force overlay mode for debugging purposes
    if (this.isAlwaysOver()) {
      return true;
    }

    // Check if panel should be in overlay mode based on current route and screen size
    return this.layoutService.shouldRightPanelOverlay();
  });

  // Convert observables to signals
  private readonly _selectedTask = toSignal(this.taskService.selectedTask$, {
    initialValue: null,
  });

  private readonly _taskDetailPanelTargetPanel = toSignal(
    this.taskService.taskDetailPanelTargetPanel$,
    { initialValue: null },
  );

  private readonly _layoutFeatureState = toSignal(
    this.store.select(selectLayoutFeatureState),
    {
      initialValue: INITIAL_LAYOUT_STATE,
    },
  );

  private readonly _isShowPluginPanel = toSignal(
    this.store.select(selectIsShowPluginPanel),
    { initialValue: false },
  );

  private readonly _activePluginId = toSignal(this.store.select(selectActivePluginId), {
    initialValue: null,
  });

  // to still display its data when panel is closing
  private _selectedTaskDelayedSignal = signal<TaskWithSubTasks | null>(null);

  // Effect to handle delayed task clearing
  private _selectedTaskDelayTimer: any;
  private _selectedTaskDelayEffect = effect(
    () => {
      const task = this._selectedTask();

      // Clear any existing timer
      if (this._selectedTaskDelayTimer) {
        clearTimeout(this._selectedTaskDelayTimer);
        this._selectedTaskDelayTimer = null;
      }

      if (task) {
        this._selectedTaskDelayedSignal.set(task);
      } else {
        // Delay clearing the task to allow animations
        this._selectedTaskDelayTimer = setTimeout(() => {
          this._selectedTaskDelayedSignal.set(null);
        }, 200);
      }
    },
    { allowSignalWrites: true },
  );

  readonly selectedTaskWithDelayForNone = computed(() =>
    this._selectedTaskDelayedSignal(),
  );

  // Computed signal for panel content
  readonly panelContent = computed<
    | 'NOTES'
    | 'TASK'
    | 'ADD_TASK_PANEL'
    | 'ISSUE_PANEL'
    | 'TASK_VIEW_CUSTOMIZER_PANEL'
    | 'PLUGIN'
    | undefined
  >(() => {
    const layoutState = this._layoutFeatureState();
    const selectedTask = this._selectedTask();

    if (!layoutState) {
      return undefined;
    }

    const {
      isShowNotes,
      isShowIssuePanel,
      isShowTaskViewCustomizerPanel,
      isShowPluginPanel,
    } = layoutState;

    if (isShowNotes) {
      return 'NOTES';
    } else if (isShowIssuePanel) {
      return 'ISSUE_PANEL';
    } else if (isShowTaskViewCustomizerPanel) {
      return 'TASK_VIEW_CUSTOMIZER_PANEL';
    } else if (isShowPluginPanel) {
      return 'PLUGIN';
    } else if (selectedTask) {
      // Task content comes last so we can avoid an extra effect to unset selected task
      return 'TASK';
    }
    return undefined;
  });

  // Computed signal that includes plugin ID for component recreation
  readonly pluginPanelKeys = computed<string[]>(() => {
    const isShowPluginPanel = this._isShowPluginPanel();
    const activePluginId = this._activePluginId();

    const keys = isShowPluginPanel && activePluginId ? [`plugin-${activePluginId}`] : [];
    Log.log('RightPanel: pluginPanelKeys computed:', {
      isShowPluginPanel,
      activePluginId,
      keys,
    });
    return keys;
  });

  // Signal to track current route
  private readonly _currentRoute = toSignal(
    this._router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this._router.url),
    ),
    { initialValue: this._router.url },
  );

  // Computed signal for panel open state
  readonly isOpen = computed<boolean>(() => {
    const selectedTask = this._selectedTask();
    const targetPanel = this._taskDetailPanelTargetPanel();
    const layoutState = this._layoutFeatureState();
    const currentRoute = this._currentRoute();

    if (!layoutState) {
      return false;
    }

    const {
      isShowNotes,
      isShowIssuePanel: isShowAddTaskPanel,
      isShowTaskViewCustomizerPanel,
      isShowPluginPanel,
    } = layoutState;

    const isWorkView = this._isWorkViewUrl(currentRoute);

    // For non-work-view routes, only allow panels that are explicitly opened
    // This prevents panels from persisting when navigating from work-view to non-work-view
    if (!isWorkView) {
      // You might want to allow certain panels on non-work-view routes
      // For now, let's allow all panels but they'll be in "over" mode
    }

    return (
      !!(
        selectedTask ||
        isShowNotes ||
        isShowAddTaskPanel ||
        isShowTaskViewCustomizerPanel ||
        isShowPluginPanel
      ) && targetPanel !== TaskDetailTargetPanel.DONT_OPEN_PANEL
    );
  });

  // NOTE: prevents the inner animation from happening file panel is expanding
  readonly isDisableTaskPanelAni = signal(true);

  // Track previous isOpen state to avoid infinite loops
  private _previousIsOpen = signal<boolean | null>(null);

  // Effect to handle panel close
  private _isOpenEffect = effect(
    () => {
      const isOpen = this.isOpen();
      const previousIsOpen = this._previousIsOpen();

      // Only trigger onClose when transitioning from open to closed
      if (previousIsOpen === true && isOpen === false) {
        // Use setTimeout to avoid triggering state changes during effect execution
        setTimeout(() => this.onClose(), 0);
      }

      this._previousIsOpen.set(isOpen);
    },
    { allowSignalWrites: true },
  );

  // Effect to handle animation state with delay
  private _animationTimer: number | null = null;
  private _animationEffect = effect(
    () => {
      const isOpen = this.isOpen();

      // Clear any existing timer
      if (this._animationTimer) {
        clearTimeout(this._animationTimer);
        this._animationTimer = null;
      }

      // Delay is needed for timing
      this._animationTimer = window.setTimeout(() => {
        this.isDisableTaskPanelAni.set(!isOpen);
      }, 500);
    },
    { allowSignalWrites: true },
  );

  // Signal to track previous route for navigation handling
  private _previousRoute = signal<{ url: string; isWorkView: boolean } | null>(null);

  // Effect for navigation handling
  private _navigationEffect = effect(
    () => {
      const currentRoute = this._currentRoute();
      const isCurrentWorkView = this._isWorkViewUrl(currentRoute);

      untracked(() => {
        const prev = this._previousRoute();

        if (prev) {
          // Only close panel when navigating FROM work-view TO non-work-view
          // Never close when navigating between work-views or to a work-view
          const shouldClose = prev.isWorkView && !isCurrentWorkView;

          // Debug logging
          if (shouldClose) {
            Log.log('RightPanel: Closing panel on navigation', {
              from: prev.url,
              to: currentRoute,
              fromIsWorkView: prev.isWorkView,
              toIsWorkView: isCurrentWorkView,
            });
            // Close all panels immediately when navigating away from work views
            // to prevent the overlay mode from briefly showing
            this.close();
          }
        }

        // Update previous route
        this._previousRoute.set({ url: currentRoute, isWorkView: isCurrentWorkView });
      });
    },
    { allowSignalWrites: true },
  );

  ngOnDestroy(): void {
    // Clean up timers to prevent memory leaks
    if (this._selectedTaskDelayTimer) {
      window.clearTimeout(this._selectedTaskDelayTimer);
    }
    if (this._animationTimer) {
      window.clearTimeout(this._animationTimer);
    }
  }

  private _isWorkViewUrl(url: string): boolean {
    return url.includes('/active/') || url.includes('/tag/') || url.includes('/project/');
  }

  close(): void {
    this.taskService.setSelectedId(null);
    this.layoutService.hideNotes();
    this.layoutService.hideAddTaskPanel();
    this.layoutService.hideTaskViewCustomizerPanel();
    this.store.dispatch(hidePluginPanel());
    this.onClose();
  }

  onClose(): void {
    this.taskService.focusLastFocusedTask();
  }
}
