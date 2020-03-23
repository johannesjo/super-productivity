import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {select, Store} from '@ngrx/store';
import {PersistenceService} from '../../../../../core/persistence/persistence.service';
import {GitlabApiService} from '../gitlab-api/gitlab-api.service';
import {GlobalConfigService} from '../../../../config/global-config.service';
import {SnackService} from '../../../../../core/snack/snack.service';
import {TaskService} from '../../../../tasks/task.service';
import {Task} from '../../../../tasks/task.model';
import {T} from '../../../../../t.const';
import {ProjectService} from '../../../../project/project.service';
import {ProjectActionTypes} from '../../../../project/store/project.actions';
import {switchMap, tap, withLatestFrom} from 'rxjs/operators';
import {EMPTY, Observable, timer} from 'rxjs';
import {GITLAB_INITIAL_POLL_DELAY, GITLAB_POLL_INTERVAL} from '../gitlab.const';
import {selectGitlabTasks} from '../../../../tasks/store/task.selectors';
import {IssueService} from '../../../issue.service';
import {GITLAB_TYPE} from '../../../issue.const';

@Injectable()
export class GitlabIssueEffects {

  // @Effect({dispatch: false})
  // pollNewIssuesToBacklog$: any = this._actions$
  //   .pipe(
  //     ofType(
  //       ProjectActionTypes.LoadProjectRelatedDataSuccess,
  //       ProjectActionTypes.UpdateProjectIssueProviderCfg,
  //     ),
  //     withLatestFrom(
  //       this._projectService.isGitlabEnabled$,
  //       this._projectService.currentGitlabCfg$,
  //     ),
  //     switchMap(([a, isEnabled, gitlabCfg]) => {
  //       return (isEnabled && gitlabCfg.isAutoAddToBacklog)
  //         ? timer(GITLAB_INITIAL_POLL_DELAY, GITLAB_POLL_INTERVAL).pipe(
  //           // tap(() => console.log('GITLAB_POLL_BACKLOG_CHANGES')),
  //           tap(this._importNewIssuesToBacklog.bind(this))
  //         )
  //         : EMPTY;
  //     }),
  //   );
  // private _pollChangesForIssues$: Observable<any> = timer(GITLAB_INITIAL_POLL_DELAY, GITLAB_POLL_INTERVAL).pipe(
  //   withLatestFrom(
  //     this._store$.pipe(select(selectGitlabTasks)),
  //   ),
  //   tap(([, gitlabTasks]: [number, Task[]]) => {
  //     if (gitlabTasks && gitlabTasks.length > 0) {
  //       this._snackService.open({
  //         msg: T.F.GITLAB.S.POLLING,
  //         svgIco: 'gitlab',
  //         isSpinner: true,
  //       });
  //       gitlabTasks.forEach((task) => this._issueService.refreshIssue(task, true, false));
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
  //     withLatestFrom(
  //       this._projectService.isGitlabEnabled$,
  //       this._projectService.currentGitlabCfg$,
  //     ),
  //     switchMap(([a, isEnabled, gitlabCfg]) => {
  //       return (isEnabled && gitlabCfg.isAutoPoll)
  //         ? this._pollChangesForIssues$
  //         : EMPTY;
  //     })
  //   );
  //
  // constructor(private readonly _actions$: Actions,
  //             private readonly _store$: Store<any>,
  //             private readonly _configService: GlobalConfigService,
  //             private readonly _snackService: SnackService,
  //             private readonly _projectService: ProjectService,
  //             private readonly _gitlabApiService: GitlabApiService,
  //             private readonly _issueService: IssueService,
  //             private readonly _taskService: TaskService,
  //             private readonly _persistenceService: PersistenceService
  // ) {
  // }
  //
  // private async _importNewIssuesToBacklog([action]: [Actions, Task[]]) {
  //   const issues = await this._gitlabApiService.getProjectData$().toPromise();
  //   const allTaskGitlabIssueIds = await this._taskService.getAllIssueIdsForCurrentProject(GITLAB_TYPE) as number[];
  //   const issuesToAdd = issues.filter(issue => !allTaskGitlabIssueIds.includes(issue.id));
  //
  //   issuesToAdd.forEach((issue) => {
  //     this._issueService.addTaskWithIssue(GITLAB_TYPE, issue, true);
  //   });
  //
  //   if (issuesToAdd.length === 1) {
  //     this._snackService.open({
  //       ico: 'cloud_download',
  //       translateParams: {
  //         issueText: `#${issuesToAdd[0].number} ${issuesToAdd[0].title}`
  //       },
  //       msg: T.F.GITLAB.S.IMPORTED_SINGLE_ISSUE,
  //     });
  //   } else if (issuesToAdd.length > 1) {
  //     this._snackService.open({
  //       ico: 'cloud_download',
  //       translateParams: {
  //         issuesLength: issuesToAdd.length
  //       },
  //       msg: T.F.GITLAB.S.IMPORTED_MULTIPLE_ISSUES,
  //     });
  //   }
  // }
}
