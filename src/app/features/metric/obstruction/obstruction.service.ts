import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { selectAllObstructions } from './store/obstruction.reducer';
import {
  addObstruction,
  deleteObstruction,
  deleteObstructions,
  updateObstruction,
} from './store/obstruction.actions';
import { Observable } from 'rxjs';
import { Obstruction, ObstructionState } from './obstruction.model';
import * as shortid from 'shortid';

@Injectable({
  providedIn: 'root',
})
export class ObstructionService {
  obstructions$: Observable<Obstruction[]> = this._store$.pipe(
    select(selectAllObstructions),
  );

  constructor(private _store$: Store<ObstructionState>) {}

  addObstruction(title: string): string {
    const id = shortid();
    this._store$.dispatch(
      addObstruction({
        obstruction: {
          title,
          id,
        },
      }),
    );
    return id;
  }

  deleteObstruction(id: string): void {
    this._store$.dispatch(deleteObstruction({ id }));
  }

  deleteObstructions(ids: string[]): void {
    this._store$.dispatch(deleteObstructions({ ids }));
  }

  updateObstruction(id: string, changes: Partial<Obstruction>): void {
    this._store$.dispatch(updateObstruction({ obstruction: { id, changes } }));
  }
}
