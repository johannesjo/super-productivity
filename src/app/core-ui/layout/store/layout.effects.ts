import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {LayoutActionTypes} from './layout.actions';
import {map} from 'rxjs/operators';
import {FocusLastActiveTask} from '../../../features/tasks/store/task.actions';

@Injectable()
export class LayoutEffects {

  // @Effect()
  // loadFoos$ = this.actions$.pipe(ofType(LayoutActionTypes.LoadLayouts));
  //
  @Effect() refocusTask$: any = this._actions$
    .pipe(
      ofType(
        LayoutActionTypes.HideAddTaskBar,
      ),
      map(() => new FocusLastActiveTask()),
    );


  constructor(private _actions$: Actions) {
  }
}
