import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { JiraIssue } from './jira-issue.model';
import { select, Store } from '@ngrx/store';
import { JiraIssueActionTypes } from './store/jira-issue.actions';
import { selectAllJiraIssues, selectJiraIssueEntities } from './store/jira-issue.reducer';
import { ProjectService } from '../../../project/project.service';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { Dictionary } from '@ngrx/entity';


@Injectable()
export class JiraIssueService {
  jiraIssues$: Observable<JiraIssue[]> = this._store.pipe(select(selectAllJiraIssues));
  jiraIssuesEntities$: Observable<Dictionary<JiraIssue>> = this._store.pipe(select(selectJiraIssueEntities));

  constructor(
    private readonly _store: Store<any>,
    private readonly _projectService: ProjectService,
    private readonly _persistenceService: PersistenceService,
  ) {
    this._projectService.currentId$.subscribe((projectId) => {
      this.loadStateForProject(projectId);
    });
  }

  // META
  // ----
  loadStateForProject(projectId) {
    const lsJiraIssueState = this._persistenceService.loadIssuesForProject(projectId, 'JIRA');
    if (lsJiraIssueState) {
      this.loadState(lsJiraIssueState);
    }
  }

  loadState(state) {
    this._store.dispatch({
      type: JiraIssueActionTypes.LoadState,
      payload: {
        state: state,
      }
    });
  }

  // CRUD
  // ----
  add(jiraIssue) {
    this._store.dispatch({
      type: JiraIssueActionTypes.AddJiraIssue,
      payload: {
        jiraIssue: jiraIssue
      }
    });
  }

  upsert(jiraIssue) {
    this._store.dispatch({
      type: JiraIssueActionTypes.UpsertJiraIssue,
      payload: {
        jiraIssue: jiraIssue
      }
    });
  }

  remove(jiraIssueId: string) {
    this._store.dispatch({
      type: JiraIssueActionTypes.DeleteJiraIssue,
      payload: {id: jiraIssueId}
    });
  }


  update(jiraIssueId: string, changedFields: Partial<JiraIssue>) {
    this._store.dispatch({
      type: JiraIssueActionTypes.UpdateJiraIssue,
      payload: {
        jiraIssue: {
          id: jiraIssueId,
          changes: changedFields
        }
      }
    });
  }
}
