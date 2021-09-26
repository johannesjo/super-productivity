import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { updateTask } from '../../../../../tasks/store/task.actions';
import { concatMap, filter, first, map, take, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { OPEN_PROJECT_TYPE } from '../../../../issue.const';
import { ProjectService } from '../../../../../project/project.service';
import { WorkContextService } from '../../../../../work-context/work-context.service';
import { MatDialog } from '@angular/material/dialog';
import { Task } from '../../../../../tasks/task.model';
import { OpenProjectCfg } from '../../open-project.model';
import { EMPTY, Observable, of } from 'rxjs';
import { DialogOpenProjectTrackTimeComponent } from '../../open-project-view-components/dialog-open-project-track-time/dialog-open-project-track-time.component';
import { OpenProjectApiService } from '../../open-project-api.service';
import { TaskService } from '../../../../../tasks/task.service';

@Injectable()
export class OpenProjectEffects {
  postTime$: any = createEffect(
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
          mainTask.issueType === OPEN_PROJECT_TYPE &&
          mainTask.issueId &&
          mainTask.projectId
            ? this._getCfgOnce$(mainTask.projectId).pipe(
                tap((openProjectCfg) => {
                  if (
                    subTask &&
                    openProjectCfg.isShowTimeTrackingDialogForEachSubTask &&
                    openProjectCfg.isShowTimeTrackingDialog
                  ) {
                    this._openTrackTimeDialog(
                      subTask,
                      +(mainTask.issueId as string),
                      openProjectCfg,
                    );
                  } else if (
                    openProjectCfg.isShowTimeTrackingDialog &&
                    !subTask &&
                    (!openProjectCfg.isShowTimeTrackingDialogForEachSubTask ||
                      !mainTask.subTaskIds.length)
                  ) {
                    this._openTrackTimeDialog(
                      mainTask,
                      +(mainTask.issueId as string),
                      openProjectCfg,
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
    private readonly _store$: Store<any>,
    private readonly _projectService: ProjectService,
    private readonly _workContextService: WorkContextService,
    private readonly _openProjectApiService: OpenProjectApiService,
    private readonly _matDialog: MatDialog,
    private readonly _taskService: TaskService,
  ) {}

  private _openTrackTimeDialog(
    task: Task,
    workPackageId: number,
    openProjectCfg: OpenProjectCfg,
  ): void {
    this._openProjectApiService
      .getById$(workPackageId, openProjectCfg)
      .pipe(take(1))
      .subscribe((workPackage) => {
        this._matDialog.open(DialogOpenProjectTrackTimeComponent, {
          restoreFocus: true,
          data: {
            workPackage,
            task,
          },
        });
      });
  }

  private _getCfgOnce$(projectId: string): Observable<OpenProjectCfg> {
    return this._projectService.getOpenProjectCfgForProject$(projectId).pipe(first());
  }
}
