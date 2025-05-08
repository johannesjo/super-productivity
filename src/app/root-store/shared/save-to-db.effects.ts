import { inject, Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { skip, switchMap } from 'rxjs/operators';
import { MemoizedSelector, Store } from '@ngrx/store';
import { PfapiService } from '../../pfapi/pfapi.service';
import { selectBoardsState } from '../../features/boards/store/boards.selectors';
import { selectConfigFeatureState } from '../../features/config/store/global-config.reducer';
import { selectIssueProviderState } from '../../features/issue/store/issue-provider.selectors';
import { selectNoteFeatureState } from '../../features/note/store/note.reducer';
import { selectProjectFeatureState } from '../../features/project/store/project.selectors';
import { selectTagFeatureState } from '../../features/tag/store/tag.reducer';
import { selectPlannerState } from '../../features/planner/store/planner.selectors';
import { selectSimpleCounterFeatureState } from '../../features/simple-counter/store/simple-counter.reducer';
import { selectImprovementFeatureState } from '../../features/metric/improvement/store/improvement.reducer';
import { selectObstructionFeatureState } from '../../features/metric/obstruction/store/obstruction.reducer';
import { selectTaskRepeatCfgFeatureState } from '../../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import { selectMetricFeatureState } from '../../features/metric/store/metric.selectors';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';
import { RootState } from '../root-state';

// NOTE task state is a bit special, since we have ui only actions and we throttle addTimeSpent
// NOTE TimeTrackingState is also a bit special, since we throttle addTimeSpent
// NOTE: reminders are saved in reminderService

@Injectable()
export class SaveToDbEffects {
  private _store = inject(Store<RootState>);
  private _actions = inject(Actions);
  private _pfapiService = inject(PfapiService);
  private _dataInitStateService = inject(DataInitStateService);

  // Infer the correct type for each modelKey from PfapiService['m']
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private createSaveEffect<K extends keyof typeof this._pfapiService.m>(
    selector: MemoizedSelector<
      RootState,
      Parameters<(typeof this._pfapiService.m)[K]['save']>[0]
    >,
    modelKey: K,
  ) {
    return createEffect(
      () =>
        this._dataInitStateService.isAllDataLoadedInitially$.pipe(
          switchMap(() => this._store.select(selector)),
          skip(1),
          switchMap((state) =>
            this._pfapiService.m[modelKey].save(state, {
              isUpdateRevAndLastUpdate: true,
            }),
          ),
        ),
      { dispatch: false },
    );
  }

  tag$ = this.createSaveEffect(selectTagFeatureState, 'tag');
  project$ = this.createSaveEffect(selectProjectFeatureState, 'project');
  globalCfg$ = this.createSaveEffect(selectConfigFeatureState, 'globalConfig');
  planner$ = this.createSaveEffect(selectPlannerState, 'planner');
  boards$ = this.createSaveEffect(selectBoardsState, 'boards');
  issueProvider$ = this.createSaveEffect(selectIssueProviderState, 'issueProvider');
  note$ = this.createSaveEffect(selectNoteFeatureState, 'note');
  metric$ = this.createSaveEffect(selectMetricFeatureState, 'metric');
  improvement$ = this.createSaveEffect(selectImprovementFeatureState, 'improvement');
  obstruction$ = this.createSaveEffect(selectObstructionFeatureState, 'obstruction');
  simpleCounter$ = this.createSaveEffect(
    selectSimpleCounterFeatureState,
    'simpleCounter',
  );
  taskRepeatCfg$ = this.createSaveEffect(
    selectTaskRepeatCfgFeatureState,
    'taskRepeatCfg',
  );
}
