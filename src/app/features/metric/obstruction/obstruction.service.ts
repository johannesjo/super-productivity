import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { initialObstructionState, selectAllObstructions } from './store/obstruction.reducer';
import {
  AddObstruction,
  DeleteObstruction,
  DeleteObstructions,
  LoadObstructionState,
  UpdateObstruction
} from './store/obstruction.actions';
import { Observable } from 'rxjs';
import { Obstruction, ObstructionState } from './obstruction.model';
import * as shortid from 'shortid';
import { PersistenceService } from '../../../core/persistence/persistence.service';

@Injectable({
  providedIn: 'root',
})
export class ObstructionService {
  obstructions$: Observable<Obstruction[]> = this._store$.pipe(select(selectAllObstructions));

  constructor(
    private _store$: Store<ObstructionState>,
    private _persistenceService: PersistenceService,
  ) {
  }

  async loadStateForProject(projectId: string) {
    const lsObstructionState = await this._persistenceService.obstruction.load(projectId);
    this.loadState(lsObstructionState || initialObstructionState);
  }

  loadState(state: ObstructionState) {
    this._store$.dispatch(new LoadObstructionState({state}));
  }

  addObstruction(title: string): string {
    const id = shortid();
    this._store$.dispatch(new AddObstruction({
      obstruction: {
        title,
        id,
      }
    }));
    return id;
  }

  deleteObstruction(id: string) {
    this._store$.dispatch(new DeleteObstruction({id}));
  }

  deleteObstructions(ids: string[]) {
    this._store$.dispatch(new DeleteObstructions({ids}));
  }

  updateObstruction(id: string, changes: Partial<Obstruction>) {
    this._store$.dispatch(new UpdateObstruction({obstruction: {id, changes}}));
  }
}
