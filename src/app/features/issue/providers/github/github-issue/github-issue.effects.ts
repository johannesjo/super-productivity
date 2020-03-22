import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {PersistenceService} from '../../../../../core/persistence/persistence.service';
import {GithubApiService} from '../github-api.service';
import {GlobalConfigService} from '../../../../config/global-config.service';
import {SnackService} from '../../../../../core/snack/snack.service';
import {TaskService} from '../../../../tasks/task.service';
import {ProjectService} from '../../../../project/project.service';
import {ProjectActionTypes} from '../../../../project/store/project.actions';
import {filter, first, map, switchMap, takeUntil, tap, withLatestFrom} from 'rxjs/operators';
import {IssueService} from '../../../issue.service';
import {forkJoin, Observable, timer} from 'rxjs';
import {GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL} from '../github.const';
import {TaskWithSubTasks} from 'src/app/features/tasks/task.model';
import {T} from '../../../../../t.const';
import {WorkContextService} from '../../../../work-context/work-context.service';
import {GITHUB_TYPE} from '../../../issue.const';
import {GithubCfg} from '../github.model';
import {isGithubEnabled} from '../is-github-enabled.util';
import {setActiveWorkContext} from '../../../../work-context/store/work-context.actions';
import {GithubIssueReduced} from './github-issue.model';
import {IssueEffectHelperService} from '../../../issue-effect-helper.service';

@Injectable()
export class GithubIssueEffects {

  @Effect({dispatch: false})
  pollNewIssuesToBacklog$: any = this._issueEffectHelperService.pollToBacklogTriggerToProjectId$.pipe(
    switchMap((pId) => this._projectService.getGithubCfgForProject$(pId).pipe(
      first(),
      filter(githubCfg => isGithubEnabled(githubCfg) && githubCfg.isAutoAddToBacklog),
      // tap(() => console.log('POLL TIMER STARTED')),
      switchMap(githubCfg => this._pollTimer$.pipe(
        takeUntil(this._issueEffectHelperService.pollToBacklogTriggerActions$),
        tap(() => console.log('GITHUB_POLL_BACKLOG_CHANGES')),
        withLatestFrom(
          this._githubApiService.getLast100IssuesForRepo$(githubCfg),
          this._taskService.getAllIssueIdsForCurrentProject(GITHUB_TYPE)
        ),
        tap(([, issues, allTaskGithubIssueIds]: [any, GithubIssueReduced[], number[]]) => {
          const issuesToAdd = issues.filter(issue => !allTaskGithubIssueIds.includes(issue.id));
          this._importNewIssuesToBacklog(pId, issuesToAdd);
        })
      )),
    )),
  );

  @Effect({dispatch: false})
  pollIssueChangesForCurrentContext$: any = this._actions$
    .pipe(
      ofType(
        setActiveWorkContext,
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
      ),
      switchMap(() => this._pollTimer$),
      switchMap(() => this._updateIssuesForCurrentContext$),
    );

  private _pollTimer$: Observable<any> = timer(GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL);

  private _updateIssuesForCurrentContext$ = this._workContextService.allTasksForCurrentContext$.pipe(
    first(),
    switchMap((tasks) => {
      const gitIssueTasks = tasks.filter(task => task.issueType === GITHUB_TYPE);
      return forkJoin(gitIssueTasks.map(task => this._projectService.getGithubCfgForProject$(task.projectId).pipe(
        first(),
        map(cfg => ({
          cfg,
          task,
        }))
        ))
      );
    }),
    map((cos) => cos
      .filter(({cfg, task}: { cfg: GithubCfg, task: TaskWithSubTasks }) =>
        isGithubEnabled(cfg) && cfg.isAutoPoll
      )
      .map(({task}: { cfg: GithubCfg, task: TaskWithSubTasks }) => task)
    ),
    tap((githubTasks: TaskWithSubTasks[]) => this._refreshIssues(githubTasks)),
  );

  constructor(
    private readonly _actions$: Actions,
    private readonly _store$: Store<any>,
    private readonly _configService: GlobalConfigService,
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    private readonly _githubApiService: GithubApiService,
    private readonly _issueService: IssueService,
    private readonly _taskService: TaskService,
    private readonly _workContextService: WorkContextService,
    private readonly _persistenceService: PersistenceService,
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

