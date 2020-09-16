import { Injectable } from '@angular/core';
import { Effect } from '@ngrx/effects';
import { GithubApiService } from '../github-api.service';
import { SnackService } from '../../../../../core/snack/snack.service';
import { TaskService } from '../../../../tasks/task.service';
import { ProjectService } from '../../../../project/project.service';
import { filter, first, map, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { IssueService } from '../../../issue.service';
import { forkJoin, Observable, timer } from 'rxjs';
import { GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL } from '../github.const';
import { TaskWithSubTasks } from 'src/app/features/tasks/task.model';
import { T } from '../../../../../t.const';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { GITHUB_TYPE } from '../../../issue.const';
import { GithubCfg } from '../github.model';
import { isGithubEnabled } from '../is-github-enabled.util';
import { GithubIssueReduced } from './github-issue.model';
import { IssueEffectHelperService } from '../../../issue-effect-helper.service';

@Injectable()
export class GithubIssueEffects {

  private _pollTimer$: Observable<any> = timer(GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL);
  @Effect({dispatch: false})
  pollNewIssuesToBacklog$: Observable<any> = this._issueEffectHelperService.pollToBacklogTriggerToProjectId$.pipe(
    switchMap((pId) => this._projectService.getGithubCfgForProject$(pId).pipe(
      first(),
      filter(githubCfg => isGithubEnabled(githubCfg) && githubCfg.isAutoAddToBacklog),
      switchMap(githubCfg => this._pollTimer$.pipe(
        // NOTE: required otherwise timer stays alive for filtered actions
        takeUntil(this._issueEffectHelperService.pollToBacklogActions$),
        tap(() => console.log('GITHUB_POLL_BACKLOG_CHANGES')),
        withLatestFrom(
          this._githubApiService.getLast100IssuesForRepo$(githubCfg),
          this._taskService.getAllIssueIdsForProject(pId, GITHUB_TYPE) as Promise<number[]>
        ),
        tap(([, issues, allTaskGithubIssueIds]: [any, GithubIssueReduced[], number[]]) => {
          const issuesToAdd = issues.filter(issue => !allTaskGithubIssueIds.includes(issue.id));
          console.log('issuesToAdd', issuesToAdd);
          if (issuesToAdd?.length) {
            this._importNewIssuesToBacklog(pId, issuesToAdd);
          }
        })
      )),
    )),
  );
  private _updateIssuesForCurrentContext$: Observable<any> = this._workContextService.allTasksForCurrentContext$.pipe(
    first(),
    switchMap((tasks) => {
      const gitIssueTasks = tasks.filter(task => task.issueType === GITHUB_TYPE);
      return forkJoin(gitIssueTasks.map(task => {
          if (!task.projectId) {
            throw new Error('No project for task');
          }
          return this._projectService.getGithubCfgForProject$(task.projectId).pipe(
            first(),
            map(cfg => ({
              cfg,
              task,
            }))
          );
        })
      );
    }),
    map((cos) => cos
      .filter(({cfg, task}: { cfg: GithubCfg, task: TaskWithSubTasks }): boolean =>
        isGithubEnabled(cfg) && cfg.isAutoPoll
      )
      .map(({task}: { cfg: GithubCfg, task: TaskWithSubTasks }) => task)
    ),
    tap((githubTasks: TaskWithSubTasks[]) => this._refreshIssues(githubTasks)),
  );
  @Effect({dispatch: false})
  pollIssueChangesForCurrentContext$: Observable<any> = this._issueEffectHelperService.pollIssueTaskUpdatesActions$
    .pipe(
      switchMap(() => this._pollTimer$),
      switchMap(() => this._updateIssuesForCurrentContext$),
    );

  constructor(
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    private readonly _githubApiService: GithubApiService,
    private readonly _issueService: IssueService,
    private readonly _taskService: TaskService,
    private readonly _workContextService: WorkContextService,
    private readonly _issueEffectHelperService: IssueEffectHelperService,
  ) {
  }

  private _refreshIssues(githubTasks: TaskWithSubTasks[]) {
    if (githubTasks && githubTasks.length > 0) {
      this._snackService.open({
        msg: T.F.GITHUB.S.POLLING,
        svgIco: 'github',
        isSpinner: true,
      });
      githubTasks.forEach((task) => this._issueService.refreshIssue(task, true, false));
    }
  }

  private _importNewIssuesToBacklog(projectId: string, issuesToAdd: GithubIssueReduced[]) {
    issuesToAdd.forEach((issue) => {
      this._issueService.addTaskWithIssue(GITHUB_TYPE, issue, projectId, true);
    });

    if (issuesToAdd.length === 1) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issueText: `#${issuesToAdd[0].number} ${issuesToAdd[0].title}`
        },
        msg: T.F.GITHUB.S.IMPORTED_SINGLE_ISSUE,
      });
    } else if (issuesToAdd.length > 1) {
      this._snackService.open({
        ico: 'cloud_download',
        translateParams: {
          issuesLength: issuesToAdd.length
        },
        msg: T.F.GITHUB.S.IMPORTED_MULTIPLE_ISSUES,
      });
    }
  }
}

