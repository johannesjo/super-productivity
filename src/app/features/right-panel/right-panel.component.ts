import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  computed,
} from '@angular/core';
import { combineLatest, Observable, of, Subscription, merge } from 'rxjs';
import { TaskDetailTargetPanel, TaskWithSubTasks } from '../tasks/task.model';
import {
  delay,
  distinctUntilChanged,
  map,
  switchMap,
  filter,
  pairwise,
  startWith,
} from 'rxjs/operators';
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
import { AsyncPipe } from '@angular/common';
import { PluginService } from '../../plugins/plugin.service';
import { PluginPanelContainerComponent } from '../../plugins/ui/plugin-panel-container/plugin-panel-container.component';
import { Store } from '@ngrx/store';
import {
  selectActivePluginId,
  selectIsShowPluginPanel,
  selectLayoutFeatureState,
} from '../../core-ui/layout/store/layout.reducer';
import { hidePluginPanel } from '../../core-ui/layout/store/layout.actions';
import { fastArrayCompare } from '../../util/fast-array-compare';
import { Log } from '../../core/log';
import { NavigationEnd, Router, NavigationStart } from '@angular/router';

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
    AsyncPipe,
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

  // Use the computed signal from layout service
  readonly isCustomOver = computed(() => {
    // Always use "over" mode for debugging
    if (this.isAlwaysOver()) {
      return true;
    }

    // Use the layout service's computed signal
    return this.layoutService.isRightPanelOverCustom();
  });

  // to still display its data when panel is closing
  selectedTaskWithDelayForNone$: Observable<TaskWithSubTasks | null> =
    this.taskService.selectedTask$.pipe(
      switchMap((task) => (task ? of(task) : of(null).pipe(delay(200)))),
    );

  panelContent$: Observable<
    | 'NOTES'
    | 'TASK'
    | 'ADD_TASK_PANEL'
    | 'ISSUE_PANEL'
    | 'TASK_VIEW_CUSTOMIZER_PANEL'
    | 'PLUGIN'
    | undefined
  > = combineLatest([
    this.store.select(selectLayoutFeatureState),
    this.taskService.selectedTask$,
  ] as const).pipe(
    map(([layoutState, selectedTask]) => {
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
    }),
    distinctUntilChanged(),
  );

  // Observable that includes plugin ID for component recreation
  pluginPanelKeys$: Observable<string[]> = combineLatest([
    this.store.select(selectIsShowPluginPanel),
    this.store.select(selectActivePluginId),
  ] as const).pipe(
    map(([isShowPluginPanel, activePluginId]) => {
      const keys =
        isShowPluginPanel && activePluginId ? [`plugin-${activePluginId}`] : [];
      Log.log('RightPanel: pluginPanelKeys$ emitted:', {
        isShowPluginPanel,
        activePluginId,
        keys,
      });
      return keys;
    }),
    distinctUntilChanged((a, b) => fastArrayCompare(a, b)),
  );

  // Observable to track current route
  private _currentRoute$: Observable<string> = this._router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => event.urlAfterRedirects),
    startWith(this._router.url),
  );

  // Observable to track if navigation is in progress
  private _isNavigating$: Observable<boolean> = merge(
    this._router.events.pipe(
      filter((event) => event instanceof NavigationStart),
      map(() => true),
    ),
    this._router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => false),
    ),
  ).pipe(startWith(false), distinctUntilChanged());

  isOpen$: Observable<boolean> = combineLatest([
    this.taskService.selectedTask$,
    this.taskService.taskDetailPanelTargetPanel$,
    this.layoutService.isShowNotes$,
    this.layoutService.isShowIssuePanel$,
    this.layoutService.isShowTaskViewCustomizerPanel$,
    this.store.select(selectIsShowPluginPanel),
    this._currentRoute$,
    this._isNavigating$,
  ] as const).pipe(
    map(
      ([
        selectedTask,
        targetPanel,
        isShowNotes,
        isShowAddTaskPanel,
        isShowTaskViewCustomizerPanel,
        isShowPluginPanel,
        currentRoute,
        isNavigating,
      ]) => {
        // Don't open panel during navigation to prevent flashing
        if (isNavigating) {
          return false;
        }

        const isWorkView = this._isWorkViewUrl(currentRoute as string);

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
      },
    ),
    distinctUntilChanged(),
  );

  // NOTE: prevents the inner animation from happening file panel is expanding
  isDisableTaskPanelAni = true;

  private _subs = new Subscription();

  constructor() {
    this._subs.add(
      this.isOpen$.subscribe((isOpen) => {
        if (!isOpen) {
          this.onClose();
        }
      }),
    );
    this._subs.add(
      // NOTE: delay is needed, because otherwise timing won't work
      this.isOpen$.pipe(delay(500)).subscribe((isOpen) => {
        this.isDisableTaskPanelAni = !isOpen;
      }),
    );

    // Add navigation handling to close panel when appropriate
    this._subs.add(
      this._router.events
        .pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          map((event) => ({
            url: event.urlAfterRedirects,
            isWorkView: this._isWorkViewUrl(event.urlAfterRedirects),
          })),
          pairwise(),
          filter(([prev, curr]) => {
            // Close panel ONLY when:
            // 1. Navigating from any route to a non-work-view route
            // 2. Navigating from non-work-view to work-view (to prevent style flash)
            // Do NOT close when navigating between work-view routes
            const shouldClose = !curr.isWorkView || (!prev.isWorkView && curr.isWorkView);

            // Debug logging
            if (shouldClose) {
              Log.log('RightPanel: Closing panel on navigation', {
                from: prev.url,
                to: curr.url,
                fromIsWorkView: prev.isWorkView,
                toIsWorkView: curr.isWorkView,
              });
            }

            return shouldClose;
          }),
        )
        .subscribe(() => {
          // Close all panels when navigating to incompatible routes
          this.close();
        }),
    );
  }

  private _isWorkViewUrl(url: string): boolean {
    return url.includes('/active/') || url.includes('/tag/') || url.includes('/project/');
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
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
