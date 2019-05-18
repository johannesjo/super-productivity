import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {<%= classify(name)%>ActionTypes} from './<%= dasherize(name)%>.actions';
import {select<%= classify(name)%>FeatureState} from './<%= dasherize(name)%>.reducer';

@Injectable()
export class <%= classify(name)%>Effects {

    @Effect({dispatch: false}) update<%= classify(name)%>s$: any = this._actions$
        .pipe(
            ofType(
                <%= classify(name)%>ActionTypes.Add<%= classify(name)%>,
                <%= classify(name)%>ActionTypes.Update<%= classify(name)%>,
                <%= classify(name)%>ActionTypes.Delete<%= classify(name)%>,
            ),
            withLatestFrom(
                this._store$.pipe(select(selectCurrentProjectId)),
                this._store$.pipe(select(select<%= classify(name)%>FeatureState)),
            ),
            tap(this._saveToLs.bind(this))
        );

    constructor(
        private _actions$: Actions,
        private _store$: Store<any>,
        private _persistenceService: PersistenceService
    ) {
    }

    private _saveToLs([action, currentProjectId, <%= camelize(name)%>State]) {
        if (currentProjectId) {
            this._persistenceService.saveLastActive();
            this._persistenceService.<%= camelize(name)%>.save(currentProjectId, <%= camelize(name)%>State);
        } else {
            throw new Error('No current project id');
        }
    }

}
