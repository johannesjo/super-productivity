import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {select, Store} from '@ngrx/store';
import {concatMap, filter, map, switchMap, take, tap, withLatestFrom} from 'rxjs/operators';
import {
  AddProject,
  ArchiveProject,
  DeleteProject,
  LoadProjectRelatedDataSuccess,
  ProjectActionTypes,
  UpdateProject,
  UpdateProjectIssueProviderCfg,
  UpdateProjectWorkEnd,
  UpdateProjectWorkStart
} from './project.actions';
import {selectProjectFeatureState} from './project.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {BookmarkService} from '../../bookmark/bookmark.service';
import {NoteService} from '../../note/note.service';
import {SnackService} from '../../../core/snack/snack.service';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {AddTimeSpent, TaskActionTypes} from '../../tasks/store/task.actions';
import {ReminderService} from '../../reminder/reminder.service';
import {MetricService} from '../../metric/metric.service';
import {ObstructionService} from '../../metric/obstruction/obstruction.service';
import {ImprovementService} from '../../metric/improvement/improvement.service';
import {ProjectService} from '../project.service';
import {BannerService} from '../../../core/banner/banner.service';
import {Router} from '@angular/router';
import {BannerId} from '../../../core/banner/banner.model';
import {GlobalConfigService} from '../../config/global-config.service';
import {T} from '../../../t.const';
import {isShowFinishDayNotification} from '../util/is-show-finish-day-notification';
import {
  moveTaskDownInBacklogList,
  moveTaskDownInTodayList,
  moveTaskInBacklogList,
  moveTaskInTodayList,
  moveTaskToBacklogList,
  moveTaskToTodayList,
  moveTaskUpInBacklogList,
  moveTaskUpInTodayList
} from '../../work-context/store/work-context-meta.actions';
import {WorkContextType} from '../../work-context/work-context.model';
import {setActiveWorkContext} from '../../work-context/store/work-context.actions';
import {WorkContextService} from '../../work-context/work-context.service';
import {Project} from '../project.model';

@Injectable()
export class ProjectEffects {
  @Effect({dispatch: false})
  syncProjectToLs$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.AddProject,
        ProjectActionTypes.DeleteProject,
        ProjectActionTypes.SetCurrentProject,
        ProjectActionTypes.UpdateProject,
        ProjectActionTypes.UpdateProjectAdvancedCfg,
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
        ProjectActionTypes.UpdateProjectWorkStart,
        ProjectActionTypes.UpdateProjectWorkEnd,
        ProjectActionTypes.AddToProjectBreakTime,
        ProjectActionTypes.UpdateProjectOrder,
        ProjectActionTypes.ArchiveProject,
        ProjectActionTypes.UnarchiveProject,
        ProjectActionTypes.UpdateLastCompletedDay,

        TaskActionTypes.AddTask,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.MoveToOtherProject,

        moveTaskInBacklogList.type,
        moveTaskToBacklogList.type,
        moveTaskToTodayList.type,
        moveTaskUpInBacklogList.type,
        moveTaskDownInBacklogList.type,
      ),
      tap((a) => {
        // exclude ui only actions
        if (!([
          ProjectActionTypes.SetCurrentProject,
          ProjectActionTypes.UpdateProjectWorkStart,
          ProjectActionTypes.UpdateProjectWorkEnd,
        ].includes(a.type as any))) {
          this._persistenceService.saveLastActive.bind(this);
        }
      }),
      switchMap(() => this.saveToLs$),
    );


  @Effect({dispatch: false})
  updateProjectStorageConditional$ = this._actions$.pipe(
    ofType(
      moveTaskInTodayList,
      moveTaskUpInTodayList,
      moveTaskDownInTodayList,
    ),
    filter((p) => p.workContextType === WorkContextType.PROJECT),
    switchMap(() => this.saveToLs$),
  );

  saveToLs$ = this._store$.pipe(
    select(selectProjectFeatureState),
    take(1),
    switchMap((projectState) => this._persistenceService.project.saveState(projectState)),
  );


  // TODO rethink & migrate
  @Effect({dispatch: false})
  checkIfDayWasFinished$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.LoadProjectRelatedDataSuccess,
      ),
      withLatestFrom(
        this._projectService.lastWorkEnd$,
        this._projectService.lastCompletedDay$,
        this._globalConfigService.misc$,
      ),
      map(([a, lastWorkEndTimestamp, lastCompletedDayStr, miscCfg]) =>
        ({a, lastWorkEndTimestamp, lastCompletedDayStr, miscCfg})),
      filter(({miscCfg}) =>
        miscCfg && !miscCfg.isDisableRemindWhenForgotToFinishDay),
      filter(({lastWorkEndTimestamp, lastCompletedDayStr}) => {
        return isShowFinishDayNotification(lastWorkEndTimestamp, lastCompletedDayStr);
      }),
      tap(({lastWorkEndTimestamp}) => {
        const dayStr = getWorklogStr(lastWorkEndTimestamp);
        this._bannerService.open({
          id: BannerId.ForgotToFinishDay,
          ico: 'info',
          msg: T.F.PROJECT.BANNER.FINISH_DAY.MSG,
          translateParams: {
            dayStr
          },
          action: {
            label: T.F.PROJECT.BANNER.FINISH_DAY.FINISH_DAY,
            fn: () => {
              this._router.navigate(['/active/daily-summary', dayStr]);
            }
          },
        });
      }),
    );


  @Effect()
  updateWorkStart$: any = this._actions$
    .pipe(
      ofType(TaskActionTypes.AddTimeSpent),
      filter((action: AddTimeSpent) => !!action.payload.task.projectId),
      concatMap((action: AddTimeSpent) => this._projectService.getById$(action.payload.task.projectId)),
      filter((project: Project) => !project.workStart[getWorklogStr()]),
      map((project) => {
        return new UpdateProjectWorkStart({
          id: project.id,
          date: getWorklogStr(),
          newVal: Date.now(),
        });
      })
    );

  @Effect()
  updateWorkEnd$: any = this._actions$
    .pipe(
      ofType(TaskActionTypes.AddTimeSpent),
      filter((action: AddTimeSpent) => !!action.payload.task.projectId),
      map((action: AddTimeSpent) => {
        return new UpdateProjectWorkEnd({
          id: action.payload.task.projectId,
          date: getWorklogStr(),
          newVal: Date.now(),
        });
      })
    );


  @Effect()
  onProjectIdChange$: any = this._actions$
    .pipe(
      ofType(
        setActiveWorkContext
      ),
      filter(({activeType}) => activeType === WorkContextType.PROJECT),
      switchMap((action) => {
        const projectId = action.activeId;
        return Promise.all([
          this._noteService.loadStateForProject(projectId),
          this._bookmarkService.loadStateForProject(projectId),
          this._metricService.loadStateForProject(projectId),
          this._improvementService.loadStateForProject(projectId),
          this._obstructionService.loadStateForProject(projectId),
        ]);
      }),
      map(data => {
        return new LoadProjectRelatedDataSuccess();
      })
    );


  // TODO a solution for orphaned tasks might be needed
  @Effect({dispatch: false})
  deleteProjectRelatedData: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.DeleteProject,
      ),
      tap(async (action: ArchiveProject) => {
        await this._persistenceService.removeCompleteRelatedDataForProject(action.payload.id);
        this._reminderService.removeReminderByWorkContextId(action.payload.id);
      }),
    );


  @Effect({dispatch: false})
  archiveProject: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.ArchiveProject,
      ),
      tap(async (action: ArchiveProject) => {
        await this._persistenceService.archiveProject(action.payload.id);
        this._reminderService.removeReminderByWorkContextId(action.payload.id);
        this._snackService.open({
          ico: 'archive',
          msg: T.F.PROJECT.S.ARCHIVED,
        });
      }),
    );

  @Effect({dispatch: false})
  unarchiveProject: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.UnarchiveProject,
      ),
      tap(async (action: ArchiveProject) => {
        await this._persistenceService.unarchiveProject(action.payload.id);

        this._snackService.open({
          ico: 'unarchive',
          msg: T.F.PROJECT.S.UNARCHIVED
        });
      }),
    );

  // PURE SNACKS
  // -----------
  @Effect({dispatch: false})
  snackUpdateIssueProvider$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
      ),
      tap((action: UpdateProjectIssueProviderCfg) => {
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.PROJECT.S.ISSUE_PROVIDER_UPDATED,
          translateParams: {
            issueProviderKey: action.payload.issueProviderKey
          }
        });
      })
    );

  @Effect({dispatch: false})
  snackUpdateBaseSettings$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.UpdateProject,
      ),
      tap((action: UpdateProject) => {
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.PROJECT.S.UPDATED,
        });
      })
    );


  @Effect({dispatch: false})
  onProjectCreatedSnack: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.AddProject,
      ),
      tap((action: AddProject) => {
        this._snackService.open({
          ico: 'add',
          type: 'SUCCESS',
          msg: T.F.PROJECT.S.CREATED,
          translateParams: {title: action.payload.project.title}
        });
      }),
    );

  @Effect({dispatch: false})
  showDeletionSnack: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.DeleteProject,
      ),
      tap((action: DeleteProject) => {
        this._snackService.open({
          ico: 'delete_forever',
          msg: T.F.PROJECT.S.DELETED
        });
      }),
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _persistenceService: PersistenceService,
    private _bookmarkService: BookmarkService,
    private _noteService: NoteService,
    private _bannerService: BannerService,
    private _globalConfigService: GlobalConfigService,
    private _reminderService: ReminderService,
    private _metricService: MetricService,
    private _obstructionService: ObstructionService,
    private _improvementService: ImprovementService,
    private _workContextService: WorkContextService,
    private _router: Router,
  ) {
  }
}


