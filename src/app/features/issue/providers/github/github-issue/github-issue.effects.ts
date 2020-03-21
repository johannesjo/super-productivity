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
import {withLatestFrom} from 'rxjs/operators';
import {IssueService} from '../../../issue.service';

@Injectable()
export class GithubIssueEffects {

  @Effect({dispatch: false})
  pollNewIssuesToBacklog$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.LoadProjectRelatedDataSuccess,
        ProjectActionTypes.UpdateProjectIssueProviderCfg,
      ),
      withLatestFrom(
        this._projectService.isGithubEnabled$,
        this._projectService.currentGithubCfg$,
      ),
      // switchMap(([a, isEnabled, githubCfg]) => {
      //   return (isEnabled && githubCfg.isAutoAddToBacklog)
      //     ? timer(GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL).pipe(
      //       // tap(() => console.log('GITHUB_POLL_BACKLOG_CHANGES')),
      //       tap(this._importNewIssuesToBacklog.bind(this))
      //     )
      //     : EMPTY;
      // }),
    );
  //
  // private _pollChangesForIssues$: Observable<any> = timer(GITHUB_INITIAL_POLL_DELAY, GITHUB_POLL_INTERVAL).pipe(
  //   withLatestFrom(
  //     this._store$.pipe(select(selectGithubTasks)),
  //   ),
  //   tap(([, githubTasks]: [number, Task[]]) => {
  //     if (githubTasks && githubTasks.length > 0) {
  //       this._snackService.open({
  //         msg: T.F.GITHUB.S.POLLING,
  //         svgIco: 'github',
  //         isSpinner: true,
  //       });
  //       githubTasks.forEach((task) => this._issueService.refreshIssue(task, true, false));
  //     }
  //   }),
  // );
  // @Effect({dispatch: false})
  // pollIssueChangesAndBacklogUpdates: any = this._actions$
  //   .pipe(
  //     ofType(
  //       // while load state should be enough this just might fix the error of polling for inactive projects?
  //       ProjectActionTypes.LoadProjectRelatedDataSuccess,
  //       ProjectActionTypes.UpdateProjectIssueProviderCfg,
  //     ),
  //     tap(console.log),
  //     withLatestFrom(
  //       this._projectService.isGithubEnabled$,
  //       this._projectService.currentGithubCfg$,
  //     ),
  //     switchMap(([a, isEnabled, githubCfg]) => {
  //       return (isEnabled && githubCfg.isAutoPoll)
  //         ? this._pollChangesForIssues$
  //         : EMPTY;
  //     })
  //   );

  constructor(private readonly _actions$: Actions,
              private readonly _store$: Store<any>,
              private readonly _configService: GlobalConfigService,
              private readonly _snackService: SnackService,
              private readonly _projectService: ProjectService,
              private readonly _githubApiService: GithubApiService,
              private readonly _issueService: IssueService,
              private readonly _taskService: TaskService,
              private readonly _persistenceService: PersistenceService
  ) {
  }

  // private async _importNewIssuesToBacklog([action]: [Actions, Task[]]) {
  //   const issues = await this._githubApiService.getLast100IssuesForRepo$().toPromise();
  //   const allTaskGithubIssueIds = await this._taskService.getAllIssueIdsForCurrentProject(GITHUB_TYPE) as number[];
  //   const issuesToAdd = issues.filter(issue => !allTaskGithubIssueIds.includes(issue.id));
  //
  //   issuesToAdd.forEach((issue) => {
  //     this._issueService.addTaskWithIssue(GITHUB_TYPE, issue, true);
  //   });
  //
  //   if (issuesToAdd.length === 1) {
  //     this._snackService.open({
  //       ico: 'cloud_download',
  //       translateParams: {
  //         issueText: `#${issuesToAdd[0].number} ${issuesToAdd[0].title}`
  //       },
  //       msg: T.F.GITHUB.S.IMPORTED_SINGLE_ISSUE,
  //     });
  //   } else if (issuesToAdd.length > 1) {
  //     this._snackService.open({
  //       ico: 'cloud_download',
  //       translateParams: {
  //         issuesLength: issuesToAdd.length
  //       },
  //       msg: T.F.GITHUB.S.IMPORTED_MULTIPLE_ISSUES,
  //     });
  //   }
  // }
}

