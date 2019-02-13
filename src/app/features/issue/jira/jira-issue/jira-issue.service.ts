import { Injectable } from '@angular/core';
import { JiraChangelogEntry, JiraIssue } from './jira-issue.model';
import { select, Store } from '@ngrx/store';
import { AddOpenJiraIssuesToBacklog, JiraIssueActionTypes } from './store/jira-issue.actions';
import { PersistenceService } from '../../../../core/persistence/persistence.service';
import { JiraIssueState, selectJiraIssueById } from './store/jira-issue.reducer';
import { mapJiraAttachmentToAttachment } from './jira-issue-map.util';
import { Attachment } from '../../../attachment/attachment.model';
import { JiraApiService } from '../jira-api.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { IssueData } from '../../issue';
import { take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { DropPasteInputType } from '../../../../core/drop-paste-input/drop-paste-input';
import { IS_ELECTRON } from '../../../../app.constants';


@Injectable({
  providedIn: 'root',
})
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

  // HELPER
  getById(id: string): Observable<JiraIssue> {
    return this._store.pipe(select(selectJiraIssueById, {id}), take(1));
  }

  loadMissingIssueData(issueId) {
    return this._jiraApiService.getIssueById(issueId, true)
      .pipe(take(1))
      .subscribe(issueData => {
        this.add(issueData);
      });

  }

  // TODO there is probably a better way to to do this
  // TODO refactor to actions
  updateIssueFromApi(issueId, oldIssueData_?: IssueData, isNotifyOnUpdate = true, isNotifyOnNoUpdateRequired = false) {
    const oldIssueData = oldIssueData_ as JiraIssue;

    return this._jiraApiService.getIssueById(issueId, true)
      .subscribe((updatedIssue) => {
        const changelog = oldIssueData_
          ? this._createChangelog(updatedIssue, oldIssueData)
          : [];
        const wasUpdated = (isNotifyOnUpdate && changelog.length > 0);
        // used for the case when there is already a changelist shown
        const isNoUpdateChangelog = (oldIssueData && oldIssueData.wasUpdated && changelog.length === 0);

        const changedFields = {
          ...updatedIssue,
          lastUpdateFromRemote: Date.now(),
          // only update those if we want to
          ...(wasUpdated ? {wasUpdated} : {}),
          ...(isNoUpdateChangelog ? {} : {changelog}),
        };

        this.update(issueId, changedFields);

        if (wasUpdated && isNotifyOnUpdate) {
          this._snackService.open({message: `Jira: ${updatedIssue.key} was updated`, icon: 'cloud_download'});
        } else if (isNotifyOnNoUpdateRequired) {
          this._snackService.open({message: `Jira: ${updatedIssue.key} already up to date`, icon: 'cloud_download'});
        }
      });
  }

  getMappedAttachmentsFromIssue(issueData: JiraIssue): Attachment[] {
    const attachments = issueData && issueData.attachments && issueData.attachments.map(mapJiraAttachmentToAttachment);
    return (IS_ELECTRON)
      ? attachments
      // TODO remove once we have proper jira download files working
        .map((attachment) => {
          const link = 'LINK' as DropPasteInputType;
          return {...attachment, type: link};
        })
      : attachments;
  }

  private _createChangelog(updatedIssue: JiraIssue, oldIssue: JiraIssue): JiraChangelogEntry[] {
    let changelog: JiraChangelogEntry[] = [];
    const oldCommentLength = oldIssue && oldIssue.comments && oldIssue.comments.length || 0;
    const newCommentLength = updatedIssue && updatedIssue.comments && updatedIssue.comments.length || 0;
    const isCommentsChanged = (oldCommentLength !== newCommentLength);

    if (updatedIssue.updated !== oldIssue.updated || isCommentsChanged) {
      const lastUpdate = oldIssue.lastUpdateFromRemote && new Date(oldIssue.lastUpdateFromRemote);
      changelog = updatedIssue.changelog.filter(
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
    }
    return changelog;
  }
}
