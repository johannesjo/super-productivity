import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { filter, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import {
  AddProject,
  DeleteProject,
  LoadProjectRelatedDataSuccess,
  ProjectActionTypes,
  UpdateProject,
  UpdateProjectIssueProviderCfg, UpdateProjectOrder,
  UpdateProjectWorkEnd,
  UpdateProjectWorkStart
} from './project.actions';
import { selectCurrentProject, selectCurrentProjectId, selectProjectFeatureState } from './project.reducer';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { TaskService } from '../../tasks/task.service';
import { BookmarkService } from '../../bookmark/bookmark.service';
import { AttachmentService } from '../../attachment/attachment.service';
import { NoteService } from '../../note/note.service';
import { IssueService } from '../../issue/issue.service';
import { SnackService } from '../../../core/snack/snack.service';
import { SnackOpen } from '../../../core/snack/store/snack.actions';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { TaskActionTypes } from '../../tasks/store/task.actions';

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
        ProjectActionTypes.UpdateProjectOrder,
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
          this._noteService.loadStateForProject(projectId),
          this._bookmarkService.loadStateForProject(projectId),
          this._attachmentService.loadStateForProject(projectId),
          this._issueService.loadStatesForProject(projectId),
          this._taskService.loadStateForProject(projectId),
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
          icon: 'add',
          type: 'SUCCESS',
          message: `Created project <strong>${action.payload.project.title}</strong>. You can select it from the menu on the top left.`
        });
      }),
    );

  @Effect() onProjectDeleted: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.DeleteProject,
      ),
      map((action: DeleteProject) => {
        return new SnackOpen({
          icon: 'delete_forever',
          message: `Deleted project <strong>${action.payload.id}</strong>`
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
          message: `Updated project settings for <strong>${action.payload.issueProviderKey}</strong>`,
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
          message: `Updated project settings`,
        });
      })
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _snackService: SnackService,
    private _persistenceService: PersistenceService,
    private _taskService: TaskService,
    private _issueService: IssueService,
    private _bookmarkService: BookmarkService,
    private _noteService: NoteService,
    private _attachmentService: AttachmentService,
  ) {
  }

  private _saveToLs([action, projectFeatureState]) {
    this._persistenceService.saveProjectsMeta(projectFeatureState);
  }
}


