import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { ProjectActionTypes } from './project.actions';
import { selectCurrentProjectId, selectProjectFeatureState } from './project.reducer';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { TaskService } from '../../tasks/task.service';
import { JiraIssueService } from '../../issue/jira/jira-issue/jira-issue.service';
import { BookmarkService } from '../../bookmark/bookmark.service';

@Injectable()
export class ProjectEffects {
  @Effect({dispatch: false}) syncProjectToLs$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.AddProject,
        ProjectActionTypes.LoadProjectState,
        ProjectActionTypes.DeleteProject,
        ProjectActionTypes.SetCurrentProject,
        ProjectActionTypes.UpdateProject,
        ProjectActionTypes.SaveProjectIssueConfig,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectProjectFeatureState))
      ),
      tap(this._saveToLs.bind(this))
    );

  @Effect({dispatch: false}) onProjectIdChange$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.LoadProjectState,
        ProjectActionTypes.SetCurrentProject,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId))
      ),
      tap(this._reloadRelatedStates.bind(this)),
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _taskService: TaskService,
    private _jiraIssueService: JiraIssueService,
    private _bookmarkService: BookmarkService,
  ) {
  }

  private _saveToLs([action, projectFeatureState]) {
    this._persistenceService.saveProjectsMeta(projectFeatureState);
  }

  private _reloadRelatedStates([action, projectId]) {
    this._taskService.loadStateForProject(projectId);
    this._jiraIssueService.loadStateForProject(projectId);
    this._bookmarkService.loadStateForProject(projectId);
  }
}


