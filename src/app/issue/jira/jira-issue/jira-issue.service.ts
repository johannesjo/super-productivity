import { Injectable } from '@angular/core';
import { JiraIssue } from './jira-issue.model';
import { Store } from '@ngrx/store';
import { JiraIssueActionTypes } from './store/jira-issue.actions';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { JiraIssueState } from './store/jira-issue.reducer';


@Injectable()
export class JiraIssueService {
  // jiraIssues$: Observable<JiraIssue[]> = this._store.pipe(select(selectAllJiraIssues));
  // jiraIssuesEntities$: Observable<Dictionary<JiraIssue>> = this._store.pipe(select(selectJiraIssueEntities));

  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
  ) {
  }

  // META
  // ----
  async loadStateForProject(projectId: string) {
    const lsJiraIssueState = await this._persistenceService.loadIssuesForProject(projectId, 'JIRA');
    if (lsJiraIssueState) {
      this.loadState(lsJiraIssueState);
    }
  }

  loadState(state: JiraIssueState) {
    this._store.dispatch({
      type: JiraIssueActionTypes.LoadState,
      payload: {
        state: state,
      }
    });
  }

  // CRUD
  // ----
  add(jiraIssue: JiraIssue) {
    this._store.dispatch({
      type: JiraIssueActionTypes.AddJiraIssue,
      payload: {
        jiraIssue: jiraIssue
      }
    });
  }

  upsert(jiraIssue: JiraIssue) {
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
