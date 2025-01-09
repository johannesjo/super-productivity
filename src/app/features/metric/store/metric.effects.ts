import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { first, switchMap, tap } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { selectMetricFeatureState } from './metric.selectors';
import { MetricState } from '../metric.model';
import { addMetric, deleteMetric, updateMetric, upsertMetric } from './metric.actions';

@Injectable()
export class MetricEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _persistenceService = inject(PersistenceService);

  updateMetrics$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addMetric, updateMetric, deleteMetric, upsertMetric),
        switchMap(() =>
          this._store$.pipe(select(selectMetricFeatureState)).pipe(first()),
        ),
        tap((state) => this._saveToLs(state)),
      ),
    { dispatch: false },
  );

  private _saveToLs(metricState: MetricState): void {
    this._persistenceService.metric.saveState(metricState, { isSyncModelChange: true });
  }
}
