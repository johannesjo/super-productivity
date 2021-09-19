import { Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { GithubApiService } from '../github-api.service';
import { SnackService } from '../../../../../core/snack/snack.service';
import { TaskService } from '../../../../tasks/task.service';
import { ProjectService } from '../../../../project/project.service';
import { filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { IssueService } from '../../../issue.service';
import { forkJoin, Observable, timer } from 'rxjs';
import { GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL } from '../github.const';
import { TaskWithSubTasks } from 'src/app/features/tasks/task.model';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { GITHUB_TYPE } from '../../../issue.const';
import { GithubCfg } from '../github.model';
import { isGithubEnabled } from '../is-github-enabled.util';
import { IssueEffectHelperService } from '../../../issue-effect-helper.service';

@Injectable()
export class GithubIssueEffects {
  private _pollTimer$: Observable<any> = timer(
    GITHUB_INITIAL_POLL_DELAY,
    GITHUB_POLL_INTERVAL,
  );

  pollNewIssuesToBacklog$: Observable<any> = createEffect(
    () =>
      this._issueEffectHelperService.pollToBacklogTriggerToProjectId$.pipe(
        switchMap((pId) =>
          this._projectService.getGithubCfgForProject$(pId).pipe(
            first(),
            filter(
              (githubCfg) => isGithubEnabled(githubCfg) && githubCfg.isAutoAddToBacklog,
            ),
            switchMap((githubCfg) =>
              this._pollTimer$.pipe(
                // NOTE: required otherwise timer stays alive for filtered actions
                takeUntil(this._issueEffectHelperService.pollToBacklogActions$),
                tap(() => console.log('GITHUB_POLL_BACKLOG_CHANGES')),
                tap(() =>
                  this._issueService.checkAndImportNewIssuesToBacklogForProject(
                    GITHUB_TYPE,
                    pId,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    { dispatch: false },
  );

  private _updateIssuesForCurrentContext$: Observable<any> =
    this._workContextService.allTasksForCurrentContext$.pipe(
      first(),
      switchMap((tasks) => {
        const gitIssueTasks = tasks.filter((task) => task.issueType === GITHUB_TYPE);
        return forkJoin(
          gitIssueTasks.map((task) => {
            if (!task.projectId) {
              throw new Error('No project for task');
            }
            return this._projectService.getGithubCfgForProject$(task.projectId).pipe(
              first(),
              map((cfg) => ({
                cfg,
                task,
              })),
            );
          }),
        );
      }),
      map((cos) =>
        cos
          .filter(
            ({ cfg, task }: { cfg: GithubCfg; task: TaskWithSubTasks }): boolean =>
              isGithubEnabled(cfg) && cfg.isAutoPoll,
          )
          .map(({ task }: { cfg: GithubCfg; task: TaskWithSubTasks }) => task),
      ),
      tap((githubTasks: TaskWithSubTasks[]) =>
        this._issueService.refreshIssues(githubTasks),
      ),
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
    private readonly _githubApiService: GithubApiService,
    private readonly _issueService: IssueService,
    private readonly _taskService: TaskService,
    private readonly _workContextService: WorkContextService,
    private readonly _issueEffectHelperService: IssueEffectHelperService,
  ) {}
}
