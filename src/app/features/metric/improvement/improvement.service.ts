import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {initialImprovementState, selectAllImprovements} from './store/improvement.reducer';
import {AddImprovement, DeleteImprovement, LoadImprovementState, UpdateImprovement} from './store/improvement.actions';
import {Observable} from 'rxjs';
import {Improvement, ImprovementState} from './improvement.model';
import shortid from 'shortid';
import {PersistenceService} from '../../../core/persistence/persistence.service';

@Injectable({
  providedIn: 'root',
})
export class ImprovementService {
  improvements$: Observable<Improvement[]> = this._store$.pipe(select(selectAllImprovements));

  constructor(
    private _store$: Store<ImprovementState>,
    private _persistenceService: PersistenceService,
  ) {
  }

  async loadStateForProject(projectId: string) {
    const lsImprovementState = await this._persistenceService.improvement.load(projectId);
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

  updateImprovement(id: string, changes: Partial<Improvement>) {
    this._store$.dispatch(new UpdateImprovement({improvement: {id, changes}}));
  }
}
