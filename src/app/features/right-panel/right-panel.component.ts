import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
} from '@angular/core';
import { combineLatest, Observable, of, Subscription } from 'rxjs';
import { TaskDetailTargetPanel, TaskWithSubTasks } from '../tasks/task.model';
import {
  delay,
  distinctUntilChanged,
  map,
  switchMap,
  filter,
  pairwise,
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
import { NavigationEnd, Router } from '@angular/router';

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
  ]).pipe(
    map(
      ([
        {
          isShowNotes,
          isShowIssuePanel,
          isShowTaskViewCustomizerPanel,
          isShowPluginPanel,
        },
        selectedTask,
      ]) => {
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
      },
    ),
    distinctUntilChanged(),
  );

  // Observable that includes plugin ID for component recreation
  pluginPanelKeys$: Observable<string[]> = combineLatest([
    this.store.select(selectIsShowPluginPanel),
    this.store.select(selectActivePluginId),
  ]).pipe(
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

  isOpen$: Observable<boolean> = combineLatest([
    this.taskService.selectedTask$,
    this.taskService.taskDetailPanelTargetPanel$,
    this.layoutService.isShowNotes$,
    this.layoutService.isShowIssuePanel$,
    this.layoutService.isShowTaskViewCustomizerPanel$,
    this.store.select(selectIsShowPluginPanel),
  ]).pipe(
    map(
      ([
        selectedTask,
        targetPanel,
        isShowNotes,
        isShowAddTaskPanel,
        isShowTaskViewCustomizerPanel,
        isShowPluginPanel,
      ]) =>
        !!(
          selectedTask ||
          isShowNotes ||
          isShowAddTaskPanel ||
          isShowTaskViewCustomizerPanel ||
          isShowPluginPanel
        ) && targetPanel !== TaskDetailTargetPanel.DONT_OPEN_PANEL,
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

    // Add navigation handling to close panel when navigating between non-work-view routes
    this._subs.add(
      this._router.events
        .pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          map((event) => this._isWorkViewUrl(event.urlAfterRedirects)),
          pairwise(),
          filter(([wasWorkView, isWorkView]) => {
            // Close panel when:
            // 1. Navigating from work-view to non-work-view
            // 2. Navigating between different non-work-view routes
            return !isWorkView;
          }),
        )
        .subscribe(() => {
          // Close all panels when navigating to non-work-view
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
