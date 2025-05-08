import { inject, Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { skip, switchMap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
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

// NOTE task state is a bit special, since we have ui only actions and we throttle addTimeSpent
// NOTE TimeTrackingState is also a bit special, since we throttle addTimeSpent
// NOTE: reminders are saved in reminderService

@Injectable()
export class SaveToDbEffects {
  private _store = inject(Store);
  private _pfapiService = inject(PfapiService);

  taskRepeatCfg$: Observable<unknown> = createEffect(
    () =>
      this._store.select(selectTaskRepeatCfgFeatureState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.taskRepeatCfg.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );

  tag$: Observable<unknown> = createEffect(
    () =>
      this._store.select(selectTagFeatureState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.tag.save(state, { isUpdateRevAndLastUpdate: true }),
        ),
      ),
    { dispatch: false },
  );

  project$: Observable<unknown> = createEffect(
    () =>
      this._store.select(selectProjectFeatureState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.project.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );

  globalCfg$ = createEffect(
    () =>
      this._store.select(selectConfigFeatureState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.globalConfig.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );

  planner$: Observable<unknown> = createEffect(
    () =>
      this._store.select(selectPlannerState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.planner.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );

  boards$: Observable<unknown> = createEffect(
    () =>
      this._store.select(selectBoardsState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.boards.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );

  simpleCounter$: Observable<unknown> = createEffect(
    () =>
      this._store.select(selectSimpleCounterFeatureState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.simpleCounter.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );

  issueProvider$ = createEffect(
    () =>
      this._store.select(selectIssueProviderState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.issueProvider.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );

  note$ = createEffect(
    () =>
      this._store.select(selectNoteFeatureState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.note.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );

  metric$ = createEffect(
    () =>
      this._store.select(selectMetricFeatureState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.metric.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );

  improvement$ = createEffect(
    () =>
      this._store.select(selectImprovementFeatureState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.improvement.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );

  obstruction$ = createEffect(
    () =>
      this._store.select(selectObstructionFeatureState).pipe(
        skip(1),
        switchMap((state) =>
          this._pfapiService.m.obstruction.save(state, {
            isUpdateRevAndLastUpdate: true,
          }),
        ),
      ),
    { dispatch: false },
  );
}
