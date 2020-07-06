import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { initialMetricState } from './store/metric.reducer';
import { AddMetric, DeleteMetric, LoadMetricState, UpdateMetric, UpsertMetric } from './store/metric.actions';
import { combineLatest, EMPTY, from, merge, Observable, of, timer } from 'rxjs';
import { LineChartData, Metric, MetricState, PieChartData, SimpleMetrics } from './metric.model';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { getWorklogStr } from '../../util/get-work-log-str';
import {
  selectImprovementCountsPieChartData,
  selectMetricById,
  selectMetricHasData,
  selectObstructionCountsPieChartData,
  selectProductivityHappinessLineChartData
} from './store/metric.selectors';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { WorklogService } from '../worklog/worklog.service';
import { ProjectService } from '../project/project.service';
import { mapSimpleMetrics } from './metric.util';
import { DEFAULT_METRIC_FOR_DAY } from './metric.const';
import { WorkContextService } from '../work-context/work-context.service';
import { WorkContextType } from '../work-context/work-context.model';
import {
  selectCheckedImprovementIdsForDay,
  selectRepeatedImprovementIds
} from './improvement/store/improvement.reducer';

@Injectable({
  providedIn: 'root',
})
export class MetricService {
  // metrics$: Observable<Metric[]> = this._store$.pipe(select(selectAllMetrics));
  hasData$: Observable<boolean> = this._store$.pipe(select(selectMetricHasData));
  // lastTrackedMetric$: Observable<Metric> = this._store$.pipe(select(selectLastTrackedMetric));
  improvementCountsPieChartData$: Observable<PieChartData | null> = this._store$.pipe(select(selectImprovementCountsPieChartData));
  obstructionCountsPieChartData$: Observable<PieChartData | null> = this._store$.pipe(select(selectObstructionCountsPieChartData));
  // productivityHappinessLineChartData$: Observable<LineChartData> = this._store$.pipe(select(selectProductivityHappinessLineChartDataComplete));

  simpleMetrics$: Observable<SimpleMetrics> = this._workContextService.activeWorkContextTypeAndId$.pipe(
    switchMap(({activeType, activeId}) => {
      return (activeType === WorkContextType.PROJECT)

        ? combineLatest([
          this._projectService.getBreakNrForProject$(activeId),
          this._projectService.getBreakTimeForProject$(activeId),
          this._worklogService.worklog$,
          this._worklogService.totalTimeSpent$,
          from(this._taskService.getAllTasksForProject(activeId))
        ]).pipe(
          map(mapSimpleMetrics),
          // because otherwise the page is always redrawn if a task is active
          take(1),
        )

        : EMPTY;
    }),
  );

  constructor(
    private _store$: Store<MetricState>,
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _worklogService: WorklogService,
    private _workContextService: WorkContextService,
    private _persistenceService: PersistenceService,
  ) {
  }

  async loadStateForProject(projectId: string) {
    const lsMetricState = await this._persistenceService.metric.load(projectId);
    this.loadState({
      ...initialMetricState,
      ...lsMetricState
    } || initialMetricState);
  }

  loadState(state: MetricState) {
    this._store$.dispatch(new LoadMetricState({state}));
  }

  // getMetricForDay$(id: string = getWorklogStr()): Observable<Metric> {
  //   if (!id) {
  //     throw new Error('No valid id provided');
  //   }
  //   return this._store$.pipe(select(selectMetricById, {id}), take(1));
  // }

  getMetricForDayOrDefaultWithCheckedImprovements$(day: string = getWorklogStr()): Observable<Metric> {
    return this._workContextService.activeWorkContextIdIfProject$.pipe(
      switchMap(() => merge(
        this._projectService.isRelatedDataLoadedForCurrentProject$.pipe(
          // required because otherwise there might be trouble
          filter((isLoaded): boolean => isLoaded),
        ),
        // TODO fix this dirty hack
        timer(500).pipe(take(1)),
      )),

      take(1),
      switchMap(() => this._store$.pipe(select(selectMetricById, {id: day})).pipe(
        switchMap((metric) => {
          return metric
            ? of(metric)
            : combineLatest([
              this._store$.pipe(select(selectCheckedImprovementIdsForDay, {day})),
              this._store$.pipe(select(selectRepeatedImprovementIds)),
            ]).pipe(
              map(([checkedImprovementIds, repeatedImprovementIds]) => {
                return {
                  id: day,
                  ...DEFAULT_METRIC_FOR_DAY,
                  improvements: checkedImprovementIds || [],
                  improvementsTomorrow: repeatedImprovementIds || [],
                };
              })
            );
        }),
      ))
    );
  }

  addMetric(metric: Metric) {
    this._store$.dispatch(new AddMetric({
      metric: {
        ...metric,
        id: metric.id || getWorklogStr(),
      }
    }));
  }

  deleteMetric(id: string) {
    this._store$.dispatch(new DeleteMetric({id}));
  }

  updateMetric(id: string, changes: Partial<Metric>) {
    this._store$.dispatch(new UpdateMetric({metric: {id, changes}}));
  }

  upsertMetric(metric: Metric) {
    this._store$.dispatch(new UpsertMetric({metric}));
  }

  upsertTodayMetric(metricIn: Partial<Metric>) {
    const day = getWorklogStr();
    const metric = {
      id: day,
      ...DEFAULT_METRIC_FOR_DAY,
      ...metricIn,
    } as Metric;
    this._store$.dispatch(new UpsertMetric({metric}));
  }

  // STATISTICS
  getProductivityHappinessChartData$(howMany: number = 20): Observable<LineChartData> {
    return this._store$.pipe(select(selectProductivityHappinessLineChartData, {howMany}));
  }

}
