import { Injectable } from '@angular/core';
import { Effect } from '@ngrx/effects';
import { GitlabApiService } from '../gitlab-api/gitlab-api.service';
import { SnackService } from '../../../../../core/snack/snack.service';
import { TaskService } from '../../../../tasks/task.service';
import { ProjectService } from '../../../../project/project.service';
import { filter, first, map, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { forkJoin, Observable, timer } from 'rxjs';
import { GITLAB_INITIAL_POLL_DELAY, GITLAB_POLL_INTERVAL } from '../gitlab.const';
import { IssueService } from '../../../issue.service';
import { IssueEffectHelperService } from '../../../issue-effect-helper.service';
import { GitlabCfg } from '../gitlab';
import { T } from 'src/app/t.const';
import { TaskWithSubTasks } from '../../../../tasks/task.model';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { GitBasedIssueEffects } from '../../common/gitbased/git-based-issue.effect';
import { GITLAB_TYPE } from '../../../issue.const';
import { IssueCacheService } from '../../../cache/issue-cache.service';
import { GitlabUser } from './gitlab-issue.model';
import { duration } from 'moment';

const isGitlabEnabled = (gitlabCfg: GitlabCfg): boolean => !!gitlabCfg && !!gitlabCfg.project;

@Injectable()
export class GitlabIssueEffects extends GitBasedIssueEffects {
  private _updateIssuesForCurrentContext$: Observable<any> = this._workContextService.allTasksForCurrentContext$.pipe(
    first(),
    switchMap((tasks) => {
      const gitIssueTasks = tasks.filter(task => task.issueType === GITLAB_TYPE);
      return forkJoin(gitIssueTasks.map(task => this._projectService.getGitlabCfgForProject$(task.projectId as string).pipe(
        first(),
        map(cfg => ({
          cfg,
          task,
        }))
        ))
      );
    }),
    map((cos: any) => cos
      .filter(({cfg, task}: { cfg: GitlabCfg, task: TaskWithSubTasks }) =>
        isGitlabEnabled(cfg) && cfg.isAutoPoll
      )
      .map(({task}: { cfg: GitlabCfg, task: TaskWithSubTasks }) => task)
    ),
    tap((gitlabTasks: TaskWithSubTasks[]) => {
      if (gitlabTasks && gitlabTasks.length > 0) {
        this._snackService.open({
          msg: T.F.GITLAB.S.POLLING,
          svgIco: 'gitlab',
          isSpinner: true,
        });
        this._issueService.refreshIssues(gitlabTasks, true, false);
      }
    }),
  );

  private _pollTimer$: Observable<any> = timer(GITLAB_INITIAL_POLL_DELAY, GITLAB_POLL_INTERVAL);

  @Effect({dispatch: false})
  pollNewIssuesToBacklog$: Observable<any> = this._issueEffectHelperService.pollToBacklogTriggerToProjectId$.pipe(
    switchMap((pId) => this._projectService.getGitlabCfgForProject$(pId).pipe(
      first(),
      filter(gitlabCfg => isGitlabEnabled(gitlabCfg) && gitlabCfg.isAutoAddToBacklog),
      switchMap(gitlabCfg => this._pollTimer$.pipe(
        // NOTE: required otherwise timer stays alive for filtered actions
        takeUntil(this._issueEffectHelperService.pollToBacklogActions$),
        tap(() => console.log('GITLAB!_POLL_BACKLOG_CHANGES')),
        withLatestFrom(
          this._projectService.getByIdLive$(pId),
          this._issueCacheService.projectCache<GitlabUser>(pId, 'GITLAB_USER', duration({days: 1}), () => {
            return this._gitlabApiService.getCurrentUser$(gitlabCfg).toPromise();
          }),
          this._gitlabApiService.getProjectData$(gitlabCfg),
          this._taskService.getAllTaskByIssueTypeForProject$(pId, GITLAB_TYPE),
        ),
        tap(([, project, user, issues, allTasks]) => this._exportChangesToBacklog(
          project,
          user,
          issues,
          allTasks,
          GITLAB_TYPE,
          T.F.GITLAB.S.IMPORTED_SINGLE_ISSUE,
          T.F.GITLAB.S.IMPORTED_MULTIPLE_ISSUES)
        )
      )),
    )),
  );
  @Effect({dispatch: false})
  pollIssueChangesForCurrentContext$: Observable<any> = this._issueEffectHelperService.pollIssueTaskUpdatesActions$
    .pipe(
      switchMap(() => this._pollTimer$),
      switchMap(() => this._updateIssuesForCurrentContext$),
    );

  constructor(
    readonly _snackService: SnackService,
    readonly _projectService: ProjectService,
    private readonly _gitlabApiService: GitlabApiService,
    readonly _issueService: IssueService,
    readonly _taskService: TaskService,
    readonly _workContextService: WorkContextService,
    readonly _issueEffectHelperService: IssueEffectHelperService,
    private readonly _issueCacheService: IssueCacheService,
  ) {
    super(_snackService, _projectService, _issueService, _taskService, _workContextService, _issueEffectHelperService);
  }
}
