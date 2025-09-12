import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
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
import { IS_TOUCH_PRIMARY } from '../../util/is-mouse-primary';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import {
  BottomPanelContainerComponent,
  BottomPanelData,
} from '../bottom-panel/bottom-panel-container.component';
import { LS } from '../../core/persistence/storage-keys.const';
import { readNumberLSBounded } from '../../util/ls-util';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';

// Right panel resize constants
const RIGHT_PANEL_CONFIG = {
  DEFAULT_WIDTH: 320,
  MIN_WIDTH: 280,
  MAX_WIDTH: 800,
  RESIZABLE: true,
  CLOSE_THRESHOLD: 100,
} as const;

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
    MatIconModule,
    MatRippleModule,
  ],
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.resizing]': 'isResizing()',
  },
})
export class RightPanelComponent implements OnInit, OnDestroy {
  taskService = inject(TaskService);
  layoutService = inject(LayoutService);
  pluginService = inject(PluginService);
  store = inject(Store);
  private _router = inject(Router);
  private _bottomSheet = inject(MatBottomSheet);
  private _bottomSheetRef: MatBottomSheetRef<BottomPanelContainerComponent> | null = null;

  // Resize functionality
  readonly currentWidth = signal<number>(RIGHT_PANEL_CONFIG.DEFAULT_WIDTH);
  readonly isResizing = signal(false);
  private readonly _startX = signal(0);
  private readonly _startWidth = signal(0);

  // Store bound functions to prevent memory leaks
  private readonly _boundOnDrag = this._handleDrag.bind(this);
  private readonly _boundOnDragEnd = this._handleDragEnd.bind(this);

  // Track listener state to prevent double attachment/removal
  private _isListenersAttached = false;

  // Performance optimization for drag events
  private _lastDragTime = 0;
  private readonly _dragThrottleMs = 16; // ~60fps

  // NOTE: used for debugging
  readonly isAlwaysOver = input<boolean>(false);

  // Computed panel width for CSS binding
  readonly panelWidth = computed(() => this.currentWidth());

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
  private _selectedTaskDelayTimer: ReturnType<typeof setTimeout> | null = null;
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
  private _animationTimer: ReturnType<typeof setTimeout> | null = null;
  private _animationEffect = effect(
    () => {
      const isOpen = this.isOpen();

      // Clear any existing timer
      if (this._animationTimer) {
        clearTimeout(this._animationTimer);
        this._animationTimer = null;
      }

      // Delay is needed for timing
      this._animationTimer = setTimeout(() => {
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

  // Effect to handle bottom sheet opening/closing on xs screens
  private _bottomSheetEffect = effect(() => {
    const isXs = this.layoutService.isXs();
    const isOpen = this.isOpen();
    const panelContent = this.panelContent();

    untracked(() => {
      // Close bottom sheet immediately when switching from xs to non-xs screens
      if (!isXs && this._bottomSheetRef) {
        this._bottomSheetRef.dismiss();
        this._bottomSheetRef = null;
        return;
      }

      // Only handle bottom sheet on xs screens
      if (isXs) {
        if (isOpen && panelContent && !this._bottomSheetRef) {
          // Open bottom sheet
          const data: BottomPanelData = { panelContent };

          this._bottomSheetRef = this._bottomSheet.open(BottomPanelContainerComponent, {
            data,
            hasBackdrop: true,
            closeOnNavigation: true,
            panelClass: 'bottom-panel-sheet',
            // Let CSS handle positioning and height
          });

          // Handle bottom sheet dismissal
          this._bottomSheetRef.afterDismissed().subscribe(() => {
            this._bottomSheetRef = null;
            this.close();
          });
        } else if (!isOpen && this._bottomSheetRef) {
          // Close bottom sheet
          this._bottomSheetRef.dismiss();
          this._bottomSheetRef = null;
        }
      }
    });
  });

  ngOnInit(): void {
    this._initializeWidth();
  }

  ngOnDestroy(): void {
    // Clean up resize state if active (emergency cleanup)
    if (this.isResizing()) {
      this._handleDragEnd();
    }

    // Clean up timers to prevent memory leaks
    if (this._selectedTaskDelayTimer) {
      clearTimeout(this._selectedTaskDelayTimer);
      this._selectedTaskDelayTimer = null;
    }
    if (this._animationTimer) {
      clearTimeout(this._animationTimer);
      this._animationTimer = null;
    }

    // Clean up bottom sheet if open
    if (this._bottomSheetRef) {
      this._bottomSheetRef.dismiss();
      this._bottomSheetRef = null;
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
    // Only restore focus on non-touch devices to prevent scroll position loss
    if (!IS_TOUCH_PRIMARY) {
      this.taskService.focusLastFocusedTask();
    }
  }

  // Resize functionality methods
  onResizeStart(event: MouseEvent): void {
    if (!RIGHT_PANEL_CONFIG.RESIZABLE || this._isListenersAttached) return;

    this.isResizing.set(true);
    this._startX.set(event.clientX);
    this._startWidth.set(this.currentWidth());

    // Mark listeners as attached before adding them
    this._isListenersAttached = true;
    document.addEventListener('mousemove', this._boundOnDrag);
    document.addEventListener('mouseup', this._boundOnDragEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    event.preventDefault();
  }

  private _handleDrag(event: MouseEvent): void {
    if (!this.isResizing()) return;

    // Throttle drag events for better performance
    const now = Date.now();
    if (now - this._lastDragTime < this._dragThrottleMs) return;
    this._lastDragTime = now;

    // Right panel resizes from left edge, so subtract delta
    const deltaX = this._startX() - event.clientX;
    const potentialWidth = this._startWidth() + deltaX;

    // If dragged below close threshold, close the panel immediately
    if (potentialWidth < RIGHT_PANEL_CONFIG.CLOSE_THRESHOLD) {
      this.isResizing.set(false);
      this._isListenersAttached = false;
      document.removeEventListener('mousemove', this._boundOnDrag);
      document.removeEventListener('mouseup', this._boundOnDragEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this.close();
      return;
    }

    const newWidth = Math.max(
      RIGHT_PANEL_CONFIG.MIN_WIDTH,
      Math.min(RIGHT_PANEL_CONFIG.MAX_WIDTH, potentialWidth),
    );

    this.currentWidth.set(newWidth);
  }

  private _handleDragEnd(): void {
    if (!this.isResizing() && !this._isListenersAttached) return;

    this.isResizing.set(false);
    this._isListenersAttached = false;

    document.removeEventListener('mousemove', this._boundOnDrag);
    document.removeEventListener('mouseup', this._boundOnDragEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Save width to localStorage with error handling
    this._saveWidthToStorage();
  }

  private _saveWidthToStorage(): void {
    try {
      localStorage.setItem(LS.RIGHT_PANEL_WIDTH, this.currentWidth().toString());
    } catch (error) {
      console.warn('Failed to save right panel width to localStorage:', error);
    }
  }

  private _initializeWidth(): void {
    try {
      // Load saved width from localStorage or use default
      const savedWidth = readNumberLSBounded(
        LS.RIGHT_PANEL_WIDTH,
        RIGHT_PANEL_CONFIG.MIN_WIDTH,
        RIGHT_PANEL_CONFIG.MAX_WIDTH,
      );

      const width = savedWidth ?? RIGHT_PANEL_CONFIG.DEFAULT_WIDTH;

      // Additional validation
      if (!Number.isFinite(width) || width < RIGHT_PANEL_CONFIG.MIN_WIDTH) {
        console.warn('Invalid right panel width detected, using default');
        this.currentWidth.set(RIGHT_PANEL_CONFIG.DEFAULT_WIDTH);
        return;
      }

      this.currentWidth.set(width);
    } catch (error) {
      console.warn('Failed to initialize right panel width:', error);
      this.currentWidth.set(RIGHT_PANEL_CONFIG.DEFAULT_WIDTH);
    }
  }
}
