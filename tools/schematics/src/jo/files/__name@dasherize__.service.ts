import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {
    initial<%= classify(name)%>State,
    selectAll<%= classify(name)%>s,
} from './store/<%= camelize(name)%>.reducer';
import {Add<%= classify(name)%>, Delete<%= classify(name)%>, Load<%= classify(name)%>State, Update<%= classify(name)%>} from './store/<%= dasherize(name)%>.actions';
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

    update<%= classify(name)%>(id: string, changes: Partial<<%= classify(name)%>>) {
        this._store$.dispatch(new Update<%= classify(name)%>({<%= camelize(name)%>: {id, changes}}));
    }
}
