import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {map, withLatestFrom} from 'rxjs/operators';
import {FocusLastActiveTask} from '../../../features/tasks/store/task.actions';
import {hideAddTaskBar} from './layout.actions';

@Injectable()
export class LayoutEffects {
  refocusTask$: any = createEffect(() => this._actions$.pipe(
    ofType(
      hideAddTaskBar,
    ),
    withLatestFrom(
    ),
    map(() => new FocusLastActiveTask()),
  ));


  constructor(private _actions$: Actions) {
  }
}
