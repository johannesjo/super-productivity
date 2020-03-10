import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, of} from 'rxjs';
import {Context, ContextState} from './context.model';
import {PersistenceService} from '../core/persistence/persistence.service';

@Injectable({
  providedIn: 'root',
})
export class ContextService {
  nonProjectContexts$: Observable<Context[]> = of([
    {
      id: 'ALL',
      title: 'All Tasks',
      icon: 'wb_sunny',
      isTranslate: true,
      criteria: [
        {projects: 'ALL'}
      ]
    }
  ]);

  activeList;

  constructor(
    private _store$: Store<ContextState>,
    private _persistenceService: PersistenceService,
  ) {
  }

  async load() {
    const lsContextState = await this._persistenceService.context.loadState();

  }
}
