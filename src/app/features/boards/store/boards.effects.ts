import { inject, Injectable } from '@angular/core';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';

@Injectable()
export class BoardsEffects {
  store = inject(Store);
  // loadBoards$ = createEffect(
  //   () => {
  //     return this.actions$.pipe(
  //       ofType(updateTaskTags),
  //       withLatestFrom(this.store.select(selectAllBoards)),
  //       tap(([action, boards]) => {
  //         console.log(action, boards);
  //       }),
  //     );
  //   },
  //   { dispatch: false },
  // );

  constructor(private actions$: Actions) {}
}
