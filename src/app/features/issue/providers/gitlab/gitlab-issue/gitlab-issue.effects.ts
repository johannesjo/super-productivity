import { Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { GitlabApiService } from '../gitlab-api/gitlab-api.service';
import { SnackService } from '../../../../../core/snack/snack.service';
import { TaskService } from '../../../../tasks/task.service';
import { ProjectService } from '../../../../project/project.service';
import { first, map, switchMap, tap } from 'rxjs/operators';
import { forkJoin, Observable, timer } from 'rxjs';
import { GITLAB_INITIAL_POLL_DELAY, GITLAB_POLL_INTERVAL } from '../gitlab.const';
import { IssueService } from '../../../issue.service';
import { GITLAB_TYPE } from '../../../issue.const';
import { IssueEffectHelperService } from '../../../issue-effect-helper.service';
import { GitlabCfg } from '../gitlab';
import { T } from 'src/app/t.const';
import { TaskWithSubTasks } from '../../../../tasks/task.model';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { isGitlabEnabled } from '../is-gitlab-enabled';

@Injectable()
export class GitlabIssueEffects {
  private _pollTimer$: Observable<any> = timer(
    GITLAB_INITIAL_POLL_DELAY,
    GITLAB_POLL_INTERVAL,
  );

  private _updateIssuesForCurrentContext$: Observable<any> =
    this._workContextService.allTasksForCurrentContext$.pipe(
      first(),
      switchMap((tasks) => {
        const gitIssueTasks = tasks.filter((task) => task.issueType === GITLAB_TYPE);
        return forkJoin(
          gitIssueTasks.map((task) =>
            this._projectService.getGitlabCfgForProject$(task.projectId as string).pipe(
              first(),
              map((cfg) => ({
                cfg,
                task,
              })),
            ),
          ),
        );
      }),
      map((cos: any) =>
        cos
          .filter(
            ({ cfg, task }: { cfg: GitlabCfg; task: TaskWithSubTasks }) =>
              isGitlabEnabled(cfg) && cfg.isAutoPoll,
          )
          .map(({ task }: { cfg: GitlabCfg; task: TaskWithSubTasks }) => task),
      ),
      tap((gitlabTasks: TaskWithSubTasks[]) => {
        if (gitlabTasks && gitlabTasks.length > 0) {
          this._snackService.open({
            msg: T.F.GITLAB.S.POLLING,
            svgIco: 'gitlab',
            isSpinner: true,
          });
          this._issueService.refreshIssues(gitlabTasks);
        }
      }),
    );

  pollIssueChangesForCurrentContext$: Observable<any> = createEffect(
    () =>
      this._issueEffectHelperService.pollIssueTaskUpdatesActions$.pipe(
        switchMap(() => this._pollTimer$),
        switchMap(() => this._updateIssuesForCurrentContext$),
      ),
    { dispatch: false },
  );

  constructor(
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    private readonly _gitlabApiService: GitlabApiService,
    private readonly _issueService: IssueService,
    private readonly _taskService: TaskService,
    private readonly _workContextService: WorkContextService,
    private readonly _issueEffectHelperService: IssueEffectHelperService,
  ) {}
}
