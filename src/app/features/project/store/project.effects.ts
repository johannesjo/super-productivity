import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {select, Store} from '@ngrx/store';
import {concatMap, filter, map, switchMap, tap, withLatestFrom} from 'rxjs/operators';
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
import {selectCurrentProject, selectCurrentProjectId, selectProjectFeatureState} from './project.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {TaskService} from '../../tasks/task.service';
import {BookmarkService} from '../../bookmark/bookmark.service';
import {AttachmentService} from '../../attachment/attachment.service';
import {NoteService} from '../../note/note.service';
import {IssueService} from '../../issue/issue.service';
import {SnackService} from '../../../core/snack/snack.service';
import {SnackOpen} from '../../../core/snack/store/snack.actions';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {TaskActionTypes} from '../../tasks/store/task.actions';
import {ReminderService} from '../../reminder/reminder.service';
import {MetricService} from '../../metric/metric.service';
import {ObstructionService} from '../../metric/obstruction/obstruction.service';
import {ImprovementService} from '../../metric/improvement/improvement.service';
import {ProjectService} from '../project.service';
import {BannerService} from '../../../core/banner/banner.service';
import {Router} from '@angular/router';
import {BannerId} from '../../../core/banner/banner.model';

// needed because we always want the check request to the jira api to finish first
const ISSUE_REFRESH_DELAY = 10000;

@Injectable()
export class ProjectEffects {
  @Effect({dispatch: false}) syncProjectToLs$: any = this._actions$
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
      ),
      withLatestFrom(
        this._store$.pipe(select(selectProjectFeatureState))
      ),
      tap(this._saveToLs.bind(this))
    );


  @Effect({dispatch: false}) updateLastActive$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.AddProject,
        ProjectActionTypes.DeleteProject,
        ProjectActionTypes.UpdateProject,
        ProjectActionTypes.UpdateProjectAdvancedCfg,
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
        ProjectActionTypes.UpdateProjectOrder,
        ProjectActionTypes.AddToProjectBreakTime,
        ProjectActionTypes.ArchiveProject,
        ProjectActionTypes.UnarchiveProject,
      ),
      tap(this._persistenceService.saveLastActive.bind(this))
    );

  @Effect() updateWorkStart$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.LoadProjectState,
        ProjectActionTypes.LoadProjectRelatedDataSuccess,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProject))
      ),
      filter(([a, projectData]) => !projectData.workStart[getWorklogStr()]),
      map(([a, projectData]) => {
        return new UpdateProjectWorkStart({
          id: projectData.id,
          date: getWorklogStr(),
          newVal: Date.now(),
        });
      })
    );

  @Effect({dispatch: false}) checkIfDayWasFinished$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.LoadProjectRelatedDataSuccess,
      ),
      withLatestFrom(
        this._projectService.lastWorkEnd$,
        this._projectService.dayCompleted$,
      ),
      filter(([a, workEnd, dayCompleted]) => {
        const workEndDate = new Date(workEnd);
        const today = new Date();
        workEndDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        // console.log('dayCompleted', dayCompleted[getWorklogStr(workEndDate)], dayCompleted, 'workEndDate', workEndDate, 'today', today);
        return workEndDate < today && !dayCompleted[getWorklogStr(workEndDate)];
      }),
      tap(([a, workEnd, dayCompleted]) => {
        const dayStr = getWorklogStr(workEnd);
        this._bannerService.open({
          id: BannerId.ForgotToFinishDay,
          ico: 'info',
          msg: `You forgot to finish your day on ${dayStr}`,
          action: {
            label: 'Finish Day',
            fn: () => {
              this._router.navigate(['/daily-summary', dayStr]);
            }
          },
        });
      }),
    );

  @Effect({dispatch: false}) dismissProjectScopeBannersOnProjectChange: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.SetCurrentProject,
      ),
      tap(() => {
        this._bannerService.dismissIfExisting(BannerId.ForgotToFinishDay);
        this._bannerService.dismissIfExisting(BannerId.JiraUnblock);
      }),
    );


  @Effect() updateWorkEnd$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTimeSpent,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProject))
      ),
      map(([a, projectData]) => {
        return new UpdateProjectWorkEnd({
          id: projectData.id,
          date: getWorklogStr(),
          newVal: Date.now(),
        });
      })
    );


  @Effect() onProjectIdChange$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.LoadProjectState,
        ProjectActionTypes.SetCurrentProject,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId))
      ),
      switchMap(([action, projectId]) => {
        return Promise.all([
          // TODO automatize
          this._noteService.loadStateForProject(projectId),
          this._bookmarkService.loadStateForProject(projectId),
          this._attachmentService.loadStateForProject(projectId),
          this._issueService.loadStatesForProject(projectId),
          this._taskService.loadStateForProject(projectId),
          this._metricService.loadStateForProject(projectId),
          this._improvementService.loadStateForProject(projectId),
          this._obstructionService.loadStateForProject(projectId),
        ]);
      }),
      map(data => {
        return new LoadProjectRelatedDataSuccess();
      })
    );

  @Effect() onProjectCreated: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.AddProject,
      ),
      map((action: AddProject) => {
        return new SnackOpen({
          ico: 'add',
          type: 'SUCCESS',
          msg: `Created project <strong>${action.payload.project.title}</strong>. You can select it from the menu on the top left.`
        });
      }),
    );

  @Effect() showDeletionSnack: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.DeleteProject,
      ),
      map((action: DeleteProject) => {
        return new SnackOpen({
          ico: 'delete_forever',
          msg: `Deleted project <strong>${action.payload.id}</strong>`
        });
      }),
    );


  @Effect({dispatch: false}) deleteProjectRelatedData: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.DeleteProject,
      ),
      tap(async (action: ArchiveProject) => {
        await this._persistenceService.removeCompleteRelatedDataForProject(action.payload.id);
        this._reminderService.removeReminderByProjectId(action.payload.id);
      }),
    );


  @Effect({dispatch: false}) archiveProject: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.ArchiveProject,
      ),
      tap(async (action: ArchiveProject) => {
        await this._persistenceService.archiveProject(action.payload.id);
        this._reminderService.removeReminderByProjectId(action.payload.id);
        this._snackService.open({
          ico: 'archive',
          msg: `Archived project <strong>${action.payload.id}</strong>`
        });
      }),
    );

  @Effect({dispatch: false}) unarchiveProject: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.UnarchiveProject,
      ),
      tap(async (action: ArchiveProject) => {
        await this._persistenceService.unarchiveProject(action.payload.id);

        this._snackService.open({
          ico: 'unarchive',
          msg: `Unarchived project <strong>${action.payload.id}</strong>`
        });
      }),
    );

  @Effect() snackUpdateIssueProvider$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
      ),
      map((action: UpdateProjectIssueProviderCfg) => {
        return new SnackOpen({
          type: 'SUCCESS',
          msg: `Updated project settings for <strong>${action.payload.issueProviderKey}</strong>`,
        });
      })
    );

  @Effect() snackUpdateBaseSettings$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.UpdateProject,
      ),
      map((action: UpdateProject) => {
        return new SnackOpen({
          type: 'SUCCESS',
          msg: `Updated project settings`,
        });
      })
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _persistenceService: PersistenceService,
    private _taskService: TaskService,
    private _issueService: IssueService,
    private _bookmarkService: BookmarkService,
    private _noteService: NoteService,
    private _bannerService: BannerService,
    private _attachmentService: AttachmentService,
    private _reminderService: ReminderService,
    private _metricService: MetricService,
    private _obstructionService: ObstructionService,
    private _improvementService: ImprovementService,
    private _router: Router,
  ) {
  }

  private _saveToLs([action, projectFeatureState]) {
    this._persistenceService.project.save(projectFeatureState);
  }
}


