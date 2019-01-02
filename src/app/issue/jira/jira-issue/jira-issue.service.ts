import { Injectable } from '@angular/core';
import { JiraChangelogEntry, JiraIssue } from './jira-issue.model';
import { Store } from '@ngrx/store';
import { AddOpenJiraIssuesToBacklog, JiraIssueActionTypes } from './store/jira-issue.actions';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { JiraIssueState } from './store/jira-issue.reducer';
import { mapJiraAttachmentToAttachment } from './jira-issue-map.util';
import { Attachment } from '../../../attachment/attachment.model';
import { JiraApiService } from '../jira-api.service';
import { SnackService } from '../../../core/snack/snack.service';
import { IssueData } from '../../issue';


@Injectable()
export class JiraIssueService {
  // jiraIssues$: Observable<JiraIssue[]> = this._store.pipe(select(selectAllJiraIssues));
  // jiraIssuesEntities$: Observable<Dictionary<JiraIssue>> = this._store.pipe(select(selectJiraIssueEntities));

  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
    private readonly _jiraApiService: JiraApiService,
    private readonly _snackService: SnackService,
  ) {
  }

  // META
  // ----
  async loadStateForProject(projectId: string) {
    const lsJiraIssueState = await this._persistenceService.loadIssuesForProject(projectId, 'JIRA') as JiraIssueState;
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

  addOpenIssuesToBacklog() {
    this._store.dispatch(new AddOpenJiraIssuesToBacklog());
  }

  // HELPER
  updateIssueFromApi(issueId, oldIssueData_: IssueData) {
    const oldIssueData = oldIssueData_ as JiraIssue;

    this._jiraApiService.getIssueById(issueId, true)
      .subscribe((updatedIssue) => {
        const oldCommentLength = oldIssueData && oldIssueData.comments && oldIssueData.comments.length;
        const newCommentLength = updatedIssue && updatedIssue.comments && updatedIssue.comments.length;
        const isCommentsChanged = (oldCommentLength !== newCommentLength);

        if (updatedIssue.updated !== oldIssueData.updated || isCommentsChanged) {
          const lastUpdate = oldIssueData.lastUpdateFromRemote && new Date(oldIssueData.lastUpdateFromRemote);
          const changelog: JiraChangelogEntry[] = updatedIssue.changelog.filter(
            entry => !lastUpdate || new Date(entry.created) > lastUpdate
          );

          if (isCommentsChanged) {
            changelog.unshift({
              created: lastUpdate.toISOString(),
              author: null,
              field: 'Comments',
              from: oldCommentLength ? oldCommentLength.toString() : '0',
              to: newCommentLength ? newCommentLength.toString() : '0',
            });
          }

          this.update(issueId, {
            ...updatedIssue,
            changelog,
            // TODO fix
            // lastUpdateFromRemote: updatedIssue.updated,
            lastUpdateFromRemote: Date.now(),
            wasUpdated: true
          });
          this._snackService.open({message: `Jira: ${updatedIssue.key} was updated`, icon: 'cloud_download'});
        }
      });
  }

  getMappedAttachmentsFromIssue(issueData: JiraIssue) {
    return issueData && issueData.attachments && issueData.attachments.map(mapJiraAttachmentToAttachment) as Attachment[];
  }
}
