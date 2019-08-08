import {Injectable} from '@angular/core';
import {JiraChangelogEntry, JiraIssue} from './jira-issue.model';
import {select, Store} from '@ngrx/store';
import {JiraIssueActionTypes} from './store/jira-issue.actions';
import {PersistenceService} from '../../../../core/persistence/persistence.service';
import {JiraIssueState, selectJiraIssueById} from './store/jira-issue.reducer';
import {mapJiraAttachmentToAttachment} from './jira-issue-map.util';
import {Attachment} from '../../../attachment/attachment.model';
import {JiraApiService} from '../jira-api.service';
import {SnackService} from '../../../../core/snack/snack.service';
import {IssueData} from '../../issue';
import {take} from 'rxjs/operators';
import {Observable, Subscription} from 'rxjs';
import {T} from '../../../../t.const';
import {JIRA_TYPE} from '../../issue.const';


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
    const lsJiraIssueState = await this._persistenceService.loadIssuesForProject(projectId, JIRA_TYPE) as JiraIssueState;
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


  update(jiraIssueId: string, changedFields: Partial<JiraIssue>, oldIssue?: JiraIssue) {
    this._store.dispatch({
      type: JiraIssueActionTypes.UpdateJiraIssue,
      payload: {
        jiraIssue: {
          id: jiraIssueId,
          changes: changedFields
        },
        oldIssue
      }
    });
  }

  // HELPER
  getById$(id: string): Observable<JiraIssue> {
    return this._store.pipe(select(selectJiraIssueById, {id}), take(1));
  }

  // TODO improve
  loadMissingIssueData(issueId): Subscription {
    return this._jiraApiService.getIssueById$(issueId, true)
      .pipe(take(1))
      .subscribe(issueData => {
        this.add(issueData);
      });

  }

  // TODO there is probably a better way to to do this
  // TODO refactor to actions
  updateIssueFromApi(issueId, oldIssueData_?: IssueData, isNotifyOnUpdate = true, isNotifyOnNoUpdateRequired = false) {
    const oldIssueData = oldIssueData_ as JiraIssue;

    return this._jiraApiService.getIssueById$(issueId, true)
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

        this.update(issueId, changedFields, oldIssueData);

        if (wasUpdated && isNotifyOnUpdate) {
          this._snackService.open({
            msg: T.F.JIRA.S.ISSUE_UPDATE,
            translateParams: {
              issueText: `${updatedIssue.key}`
            },
            ico: 'cloud_download',
          });
        } else if (isNotifyOnNoUpdateRequired) {
          this._snackService.open({
            msg: T.F.JIRA.S.ISSUE_NO_UPDATE_REQUIRED,
            translateParams: {
              issueText: `${updatedIssue.key}`
            },
            ico: 'cloud_download',
          });
        }
      });
  }

  getMappedAttachmentsFromIssue(issueData: JiraIssue): Attachment[] {
    return issueData && issueData.attachments && issueData.attachments.map(mapJiraAttachmentToAttachment);
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
          created: new Date().toISOString(),
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
