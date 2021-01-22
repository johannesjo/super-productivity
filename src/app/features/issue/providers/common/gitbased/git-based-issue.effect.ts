import {SnackService} from '../../../../../core/snack/snack.service';
import {ProjectService} from '../../../../project/project.service';
import {IssueService} from '../../../issue.service';
import {TaskService} from '../../../../tasks/task.service';
import {WorkContextService} from '../../../../work-context/work-context.service';
import {IssueEffectHelperService} from '../../../issue-effect-helper.service';
import {Project} from '../../../../project/project.model';
import {Task} from '../../../../tasks/task.model';
import {IssueProviderKey} from '../../../issue.model';
import {GitBasedIssue, GitBasedUser} from './git-based-issue.model';

export class GitBasedIssueEffects {
  constructor(
    protected readonly _snackService: SnackService,
    protected readonly _projectService: ProjectService,
    protected readonly _issueService: IssueService,
    protected readonly _taskService: TaskService,
    protected readonly _workContextService: WorkContextService,
    protected readonly _issueEffectHelperService: IssueEffectHelperService,
  ) {
  }

  protected _exportChangesToBacklog(
    project: Project,
    user: GitBasedUser,
    issues: GitBasedIssue[],
    allTaskByType: Task[],
    provider: IssueProviderKey,
    singleIssueMessage: string,
    multipleIssueMessage: string) {
    const userOwnIssues = issues.filter(issue => issue.assignee && issue.assignee.id === user.id);
    const backlogTasks = allTaskByType.filter(task => project.backlogTaskIds && project.backlogTaskIds.includes(task.id));
    const removableTaskIdList = backlogTasks.filter(task => !userOwnIssues.some(ownIssue => task.issueId !== ownIssue.id.toString())).map(task => task.id);
    const remainingTaskIdList = project.backlogTaskIds.filter(oldBacklogTaskId => !removableTaskIdList.includes(oldBacklogTaskId));
    this._projectService.update(project.id, {
      backlogTaskIds: remainingTaskIdList
    });
    this._taskService.removeMultipleMainTasks(removableTaskIdList);

    const ownIssueIdList = allTaskByType.filter(task => task.issueId).map(task => Number(task.issueId));
    const issuesToAdd = userOwnIssues.filter(issue => !ownIssueIdList.some(existingId => existingId === issue.id));

    if (issuesToAdd?.length) {
      issuesToAdd.forEach((issue) => this._issueService.addTaskWithIssue(provider, issue.id, project.id, true));
    }
    if (issuesToAdd.length === 1) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issueText: `#${issuesToAdd[0].number} ${issuesToAdd[0].title}`
        },
        msg: singleIssueMessage,
      });
    } else if (issuesToAdd.length > 1) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issuesLength: issuesToAdd.length
        },
        msg: multipleIssueMessage,
      });
    }
  }
}
