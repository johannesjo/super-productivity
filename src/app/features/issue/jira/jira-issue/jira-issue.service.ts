import {Injectable} from '@angular/core';
import {JiraChangelogEntry, JiraIssue} from './jira-issue.model';
import {Store} from '@ngrx/store';
import {JiraIssueActionTypes} from './store/jira-issue.actions';
import {PersistenceService} from '../../../../core/persistence/persistence.service';
import {mapJiraAttachmentToAttachment} from './jira-issue-map.util';
import {Attachment} from '../../../attachment/attachment.model';
import {JiraApiService} from '../jira-api.service';
import {SnackService} from '../../../../core/snack/snack.service';
import {Subscription} from 'rxjs';
import {T} from '../../../../t.const';
import {Task} from 'src/app/features/tasks/task.model';
import {TaskService} from '../../../tasks/task.service';


@Injectable({
  providedIn: 'root',
})
export class JiraIssueService {
  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService,
    private readonly _jiraApiService: JiraApiService,
    private readonly _snackService: SnackService,
    private readonly _taskService: TaskService,
  ) {
  }


  // META
  // ----
  async loadStateForProject(projectId: string) {
  }

  loadState(state) {
  }

  // CRUD
  // ----
  add(jiraIssue: JiraIssue) {
  }

  upsert(jiraIssue: JiraIssue) {
  }

  remove(jiraIssueId: string) {
  }


  // NOTE: this can stay
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

  // TODO remove
  loadMissingIssueData(issueId): Subscription {
    return new Subscription();
  }

  // TODO there is probably a better way to to do this
  // TODO refactor to actions
  updateIssueFromApi(task: Task, isNotifyOnUpdate = true, isNotifyOnNoUpdateRequired = false) {
    return this._jiraApiService.getIssueById$(task.issueId, false)
      .subscribe((issue: JiraIssue) => {
        // @see https://developer.atlassian.com/cloud/jira/platform/jira-expressions-type-reference/#date
        const newUpdated = new Date(issue.updated).getTime();
        const wasUpdated = newUpdated > (task.issueLastUpdated || 0);

        if (wasUpdated) {
          this._taskService.update(task.id, {
            issueLastUpdated: newUpdated,
            issueWasUpdated: wasUpdated,
            issueAttachmentNr: issue.attachments.length,
            issuePoints: issue.storyPoints
          });
        }

        // NOTIFICATIONS
        if (wasUpdated && isNotifyOnUpdate) {
          this._snackService.open({
            msg: T.F.JIRA.S.ISSUE_UPDATE,
            translateParams: {
              issueText: `${issue.key}`
            },
            ico: 'cloud_download',
          });
        } else if (isNotifyOnNoUpdateRequired) {
          this._snackService.open({
            msg: T.F.JIRA.S.ISSUE_NO_UPDATE_REQUIRED,
            translateParams: {
              issueText: `${issue.key}`
            },
            ico: 'cloud_download',
          });
        }
      });
  }

  getMappedAttachmentsFromIssue(issueData: JiraIssue): Attachment[] {
    return issueData && issueData.attachments && issueData.attachments.map(mapJiraAttachmentToAttachment);
  }

  // TODO find solution
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
