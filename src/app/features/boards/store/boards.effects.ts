import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { BoardsActions } from './boards.actions';
import { selectBoardsState } from './boards.selectors';
import { PfapiService } from '../../../pfapi/pfapi.service';

@Injectable()
export class BoardsEffects {
  private _actions$ = inject(Actions);
  private _store = inject(Store);
  private _pfapiService = inject(PfapiService);

  syncProjectToLs$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          BoardsActions.addBoard,
          BoardsActions.updateBoard,
          BoardsActions.removeBoard,
          BoardsActions.updatePanelCfgTaskIds,
          BoardsActions.updatePanelCfg,
        ),
        switchMap(() => this.saveToLs$()),
      ),
    { dispatch: false },
  );

  private saveToLs$(): Observable<unknown> {
    return this._store.pipe(
      // tap(() => console.log('SAVE')),
      select(selectBoardsState),
      take(1),
      switchMap((boardsState) =>
        this._pfapiService.m.boards.save(boardsState, {
          isSyncModelChange: true,
        }),
      ),
    );
  }
}
