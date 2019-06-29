import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {take} from 'rxjs/operators';
import {
    initial<%= classify(name)%>State,
    selectAll<%= classify(name)%>s,
    select<%= classify(name)%>ById,
} from './store/<%= dasherize(name)%>.reducer';
import {
  Add<%= classify(name)%>,
  Delete<%= classify(name)%>,
  Delete<%= classify(name)%>s,
  Load<%= classify(name)%>State,
  Update<%= classify(name)%>,
  Upsert<%= classify(name)%>,
} from './store/<%= dasherize(name)%>.actions';
import {Observable} from 'rxjs';
import {<%= classify(name)%>, <%= classify(name)%>State} from './<%= dasherize(name)%>.model';
import shortid from 'shortid';

@Injectable({
    providedIn: 'root',
})
export class <%= classify(name)%>Service {
    <%= camelize(name)%>s$: Observable<<%= classify(name)%>[]> = this._store$.pipe(select(selectAll<%= classify(name)%>s));

    constructor(
        private _store$: Store<<%= classify(name)%>State>,
        private _persistenceService: PersistenceService,
    ) {
    }

    async loadStateForProject(projectId: string) {
        const ls<%= classify(name)%>State = await this._persistenceService.<%= camelize(name)%>.load(projectId);
        this.loadState(ls<%= classify(name)%>State || initial<%= classify(name)%>State);
    }

    get<%= classify(name)%>ById$(id: string): Observable<<%= classify(name)%>> {
      return this._store$.pipe(select(select<%= classify(name)%>ById, {id}), take(1));
    }

    loadState(state: <%= classify(name)%>State) {
        this._store$.dispatch(new Load<%= classify(name)%>State({state}));
    }

    add<%= classify(name)%>(<%= camelize(name)%>: <%= classify(name)%>) {
        this._store$.dispatch(new Add<%= classify(name)%>({
            <%= camelize(name)%>: {
                ...<%= camelize(name)%>,
                id: shortid()
            }
        }));
    }

    delete<%= classify(name)%>(id: string) {
        this._store$.dispatch(new Delete<%= classify(name)%>({id}));
    }

    delete<%= classify(name)%>s(ids: string[]) {
        this._store$.dispatch(new Delete<%= classify(name)%>s({ids}));
    }

    update<%= classify(name)%>(id: string, changes: Partial<<%= classify(name)%>>) {
        this._store$.dispatch(new Update<%= classify(name)%>({<%= camelize(name)%>: {id, changes}}));
    }

    upsert<%= classify(name)%>(<%= camelize(name)%>: <%= classify(name)%>) {
      this._store$.dispatch(new Upsert<%= classify(name)%>({<%= camelize(name)%>}));
    }
}
