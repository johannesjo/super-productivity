import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {take} from 'rxjs/operators';
import {
  initialIntelligentListState,
  selectAllIntelligentLists, selectCurrentIntelligentListId,
  selectIntelligentListById,
} from './store/intelligent-list.reducer';
import {
  addIntelligentList,
  deleteIntelligentList,
  deleteIntelligentLists,
  loadIntelligentListState,
  updateIntelligentList,
  upsertIntelligentList,
} from './store/intelligent-list.actions';
import {merge, Observable} from 'rxjs';
import {IntelligentList, IntelligentListState} from './intelligent-list.model';
import shortid from 'shortid';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {ProjectService} from '../project/project.service';

@Injectable({
  providedIn: 'root',
})
export class IntelligentListService {
  // activeList$: Observable<IntelligentList> = merge([
  //   this.currentListId$.
  // ]);


  intelligentLists$: Observable<IntelligentList[]> = this._store$.pipe(select(selectAllIntelligentLists));
  currentListId$: Observable<string> = this._store$.pipe(select(selectCurrentIntelligentListId));

  constructor(
    private _store$: Store<IntelligentListState>,
    private _persistenceService: PersistenceService,
    private _projectService: ProjectService,
  ) {
  }

  async load() {
    const lsIntelligentListState = await this._persistenceService.intelligentList.loadState();
    const state = lsIntelligentListState || initialIntelligentListState;
    this._store$.dispatch(loadIntelligentListState({state}));

  }

  getIntelligentListById$(id: string): Observable<IntelligentList> {
    return this._store$.pipe(select(selectIntelligentListById, {id}), take(1));
  }

  addIntelligentList(intelligentList: IntelligentList) {
    this._store$.dispatch(addIntelligentList({
      intelligentList: {
        ...intelligentList,
        id: shortid()
      }
    }));
  }

  deleteIntelligentList(id: string) {
    this._store$.dispatch(deleteIntelligentList({id}));
  }

  deleteIntelligentLists(ids: string[]) {
    this._store$.dispatch(deleteIntelligentLists({ids}));
  }

  updateIntelligentList(id: string, changes: Partial<IntelligentList>) {
    this._store$.dispatch(updateIntelligentList({intelligentList: {id, changes}}));
  }

  upsertIntelligentList(intelligentList: IntelligentList) {
    this._store$.dispatch(upsertIntelligentList({intelligentList}));
  }
}
