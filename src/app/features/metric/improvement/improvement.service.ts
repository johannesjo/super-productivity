import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { initialImprovementState, selectAllImprovements, } from './store/improvement.reducer';
import {
  AddImprovement,
  ClearHiddenImprovements,
  DeleteImprovement,
  DeleteImprovements,
  HideImprovement,
  LoadImprovementState,
  UpdateImprovement
} from './store/improvement.actions';
import { Observable } from 'rxjs';
import { Improvement, ImprovementState } from './improvement.model';
import shortid from 'shortid';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { selectLastTrackedImprovementsTomorrow } from '../store/metric.selectors';

@Injectable({
  providedIn: 'root',
})
export class ImprovementService {
  improvements$: Observable<Improvement[]> = this._store$.pipe(select(selectAllImprovements));
  lastTrackedImprovementsTomorrow$: Observable<Improvement[]> = this._store$.pipe(select(selectLastTrackedImprovementsTomorrow));

  constructor(
    private _store$: Store<ImprovementState>,
    private _persistenceService: PersistenceService,
  ) {
  }

  async load() {
    const lsImprovementState = await this._persistenceService.improvement.load();
    this.loadState(lsImprovementState || initialImprovementState);
  }

  loadState(state: ImprovementState) {
    this._store$.dispatch(new LoadImprovementState({state}));
  }

  addImprovement(title: string): string {
    const id = shortid();
    this._store$.dispatch(new AddImprovement({
      improvement: {
        title,
        id,
      }
    }));
    return id;
  }

  deleteImprovement(id: string) {
    this._store$.dispatch(new DeleteImprovement({id}));
  }

  deleteImprovements(ids: string[]) {
    this._store$.dispatch(new DeleteImprovements({ids}));
  }

  updateImprovement(id: string, changes: Partial<Improvement>) {
    this._store$.dispatch(new UpdateImprovement({improvement: {id, changes}}));
  }

  hideImprovement(id: string) {
    this._store$.dispatch(new HideImprovement({id}));
  }

  clearHiddenImprovements() {
    this._store$.dispatch(new ClearHiddenImprovements());
  }
}
