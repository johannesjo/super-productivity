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
import { Task, TaskWithSubTasks } from 'src/app/features/tasks/task.model';
import { T } from '../../../../../t.const';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { GITHUB_TYPE } from '../../../issue.const';
import { GithubCfg } from '../github.model';
import { isGithubEnabled } from '../is-github-enabled.util';
import { IssueEffectHelperService } from '../../../issue-effect-helper.service';
import { GitBasedIssueEffects } from '../../common/gitbased/git-based-issue.effect';
import { IssueCacheService } from '../../../cache/issue-cache.service';
import { GithubUser } from './github-issue.model';
import { duration } from 'moment';

@Injectable()
export class GithubIssueEffects extends GitBasedIssueEffects {

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
          this._projectService.getByIdLive$(pId),
          this._issueCacheService.projectCache<GithubUser>(pId, 'GITHUB_USER', duration({days: 1}), () => {
            return this._githubApiService.getCurrentUser$(githubCfg).toPromise();
          }),
          this._githubApiService.getLast100IssuesForRepo$(githubCfg),
          this._taskService.getAllTaskByIssueTypeForProject$(pId, GITHUB_TYPE) as Promise<Task[]>
        ),
        tap((x) => console.log('GITHUB_POLL_BACKLOG_FETCH', x)),
        tap(([, project, user, issues, allTaskByType]) => this._exportChangesToBacklog(
          project,
          user,
          issues,
          allTaskByType,
          GITHUB_TYPE,
          T.F.GITHUB.S.IMPORTED_SINGLE_ISSUE,
          T.F.GITHUB.S.IMPORTED_MULTIPLE_ISSUES)
        )
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
    readonly _issueCacheService: IssueCacheService,
    readonly _snackService: SnackService,
    readonly _projectService: ProjectService,
    private readonly _githubApiService: GithubApiService,
    readonly _issueService: IssueService,
    readonly _taskService: TaskService,
    readonly _workContextService: WorkContextService,
    readonly _issueEffectHelperService: IssueEffectHelperService,
  ) {
    super(_snackService, _projectService, _issueService, _taskService, _workContextService, _issueEffectHelperService);
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

}

