import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import * as <%= camelize(name)%>Actions from './<%= dasherize(name)%>.actions';
import {select<%= classify(name)%>FeatureState} from './<%= dasherize(name)%>.reducer';


@Injectable()
export class <%= classify(name)%>Effects {

  update<%= classify(name)%>sStorage$ = createEffect(() => this._actions$.pipe(
    ofType(
      <%= camelize(name)%>Actions.add<%= classify(name)%>,
      <%= camelize(name)%>Actions.update<%= classify(name)%>,
      <%= camelize(name)%>Actions.upsert<%= classify(name)%>,
      <%= camelize(name)%>Actions.delete<%= classify(name)%>,
      <%= camelize(name)%>Actions.delete<%= classify(name)%>s,
    ),
    withLatestFrom(
      this._store$.pipe(select(selectCurrentProjectId)),
      this._store$.pipe(select(select<%= classify(name)%>FeatureState)),
    ),
    tap(this._saveToLs.bind(this)),
    tap(this._updateLastActive.bind(this)),
  ), {dispatch: false});


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
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

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }
}
