import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { toggleShowNotes } from './layout.actions';
import { concatMap, filter, withLatestFrom } from 'rxjs/operators';
import { TaskService } from '../../../features/tasks/task.service';
import { LayoutService } from '../layout.service';
import { setSelectedTask } from '../../../features/tasks/store/task.actions';

@Injectable()
export class LayoutEffects {
  showNotesWhenTaskIsSelected$ = createEffect(() =>
    this.actions$.pipe(
      ofType(toggleShowNotes),
      withLatestFrom(this.taskService.selectedTaskId$, this.layoutService.isShowNotes$),
      filter(
        ([a, selectedTaskId, isShowNotes]) =>
          isShowNotes === false && selectedTaskId !== null,
      ),
      concatMap(() => [setSelectedTask({ id: null }), toggleShowNotes()]),
    ),
  );

  constructor(
    private actions$: Actions,
    private taskService: TaskService,
    private layoutService: LayoutService,
  ) {}
}
