import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { updateTask } from '../../../../tasks/store/task.actions';
import { concatMap, filter, first, map, take, tap } from 'rxjs/operators';
import { EMPTY, Observable, of } from 'rxjs';
import { GITLAB_TYPE } from '../../../issue.const';
import { TaskService } from '../../../../tasks/task.service';
import { ProjectService } from '../../../../project/project.service';
import { Task } from '../../../../tasks/task.model';
import { GitlabApiService } from '../gitlab-api/gitlab-api.service';
import { GitlabCfg } from '../gitlab';
import { MatDialog } from '@angular/material/dialog';

@Injectable()
export class GitlabIssueEffects {
  addWorkLog$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTask),
        filter(({ task }) => task.changes.isDone === true),
        concatMap(({ task }) => this._taskService.getByIdOnce$(task.id as string)),
        concatMap((task) =>
          task.parentId
            ? this._taskService
                .getByIdOnce$(task.parentId)
                .pipe(map((parent) => ({ mainTask: parent, subTask: task })))
            : of({ mainTask: task, subTask: undefined }),
        ),
        concatMap(({ mainTask, subTask }) =>
          mainTask.issueType === GITLAB_TYPE && mainTask.issueId && mainTask.projectId
            ? this._getCfgOnce$(mainTask.projectId).pipe(
                tap((gitlabProjectCfg) => {
                  if (
                    subTask &&
                    gitlabProjectCfg.isWorklogEnabled &&
                    gitlabProjectCfg.isAddWorklogOnSubTaskDone
                  ) {
                    this._openWorklogDialog(
                      subTask,
                      mainTask.issueId as string,
                      gitlabProjectCfg,
                    );
                  } else if (
                    gitlabProjectCfg.isAddWorklogOnSubTaskDone &&
                    !subTask &&
                    (!gitlabProjectCfg.isWorklogEnabled || !mainTask.subTaskIds.length)
                  ) {
                    this._openWorklogDialog(
                      mainTask,
                      mainTask.issueId as string,
                      gitlabProjectCfg,
                    );
                  }
                }),
              )
            : EMPTY,
        ),
      ),
    { dispatch: false },
  );

  constructor(
    private readonly _actions$: Actions,
    private readonly _taskService: TaskService,
    private readonly _projectService: ProjectService,
    private readonly _gitlabApiService: GitlabApiService,
    private readonly _matDialog: MatDialog,
  ) {}

  private _getCfgOnce$(projectId: string): Observable<GitlabCfg> {
    return this._projectService.getGitlabCfgForProject$(projectId).pipe(first());
  }

  private _openWorklogDialog(task: Task, issueId: string, gitlabCfg: GitlabCfg): void {
    this._gitlabApiService
      .getById$(issueId, gitlabCfg)
      .pipe(take(1))
      .subscribe((issue) => {
        alert('OPEN DIALOG');
        // this._matDialog.open(DialogJiraAddWorklogComponent, {
        //   restoreFocus: true,
        //   data: {
        //     issue,
        //     task,
        //   },
        // });
      });
  }
}
