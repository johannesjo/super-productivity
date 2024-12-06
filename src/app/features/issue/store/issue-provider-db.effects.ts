import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { selectIssueProviderState } from './issue-provider.selectors';
import { IssueProviderActions } from './issue-provider.actions';

@Injectable()
export class IssueProviderDbEffects {
  syncProjectToLs$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          IssueProviderActions.addIssueProvider,
          IssueProviderActions.updateIssueProvider,
          IssueProviderActions.upsertIssueProvider,
          IssueProviderActions.deleteIssueProvider,

          IssueProviderActions.addIssueProviders,
          IssueProviderActions.updateIssueProviders,
          IssueProviderActions.upsertIssueProviders,
          IssueProviderActions.deleteIssueProviders,

          IssueProviderActions.sortIssueProvidersFirst,

          IssueProviderActions.clearIssueProviders,
        ),
        switchMap(() => this.saveToLs$(false)),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _store: Store,
    private _persistenceService: PersistenceService,
  ) {}

  private saveToLs$(isSyncModelChange: boolean): Observable<unknown> {
    return this._store.pipe(
      // tap(() => console.log('SAVE')),
      select(selectIssueProviderState),
      take(1),
      switchMap((issueProviderState) =>
        this._persistenceService.issueProvider.saveState(issueProviderState, {
          isSyncModelChange,
        }),
      ),
    );
  }
}
