import { Injectable, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  INITIAL_LAYOUT_STATE,
  selectLayoutFeatureState,
} from '../../core-ui/layout/store/layout.reducer';
import { toSignal } from '@angular/core/rxjs-interop';
import { TaskService } from '../tasks/task.service';

export type PanelContentType =
  | 'NOTES'
  | 'TASK'
  | 'ADD_TASK_PANEL'
  | 'ISSUE_PANEL'
  | 'TASK_VIEW_CUSTOMIZER_PANEL'
  | 'PLUGIN';

@Injectable({ providedIn: 'root' })
export class PanelContentService {
  private _taskService = inject(TaskService);
  private _store = inject(Store);

  private readonly _selectedTask = toSignal(this._taskService.selectedTask$, {
    initialValue: null,
  });

  private readonly _layoutFeatureState = toSignal(
    this._store.select(selectLayoutFeatureState),
    {
      initialValue: INITIAL_LAYOUT_STATE,
    },
  );

  readonly panelType = computed<PanelContentType | null>(() => {
    const layoutState = this._layoutFeatureState();
    const selectedTask = this._selectedTask();
    if (!layoutState) return null;

    const {
      isShowNotes,
      isShowIssuePanel,
      isShowTaskViewCustomizerPanel,
      isShowPluginPanel,
    } = layoutState;

    if (isShowNotes) return 'NOTES';
    if (isShowIssuePanel) return 'ISSUE_PANEL';
    if (isShowTaskViewCustomizerPanel) return 'TASK_VIEW_CUSTOMIZER_PANEL';
    if (isShowPluginPanel) return 'PLUGIN';
    if (selectedTask) return 'TASK';
    return null;
  });

  getCurrentPanelType(): PanelContentType | null {
    return this.panelType();
  }
}
