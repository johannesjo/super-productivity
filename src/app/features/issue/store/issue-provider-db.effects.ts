import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { selectIssueProviderState } from './issue-provider.selectors';
import { IssueProviderActions } from './issue-provider.actions';
import { deleteProject } from '../../project/store/project.actions';

@Injectable()
export class IssueProviderDbEffects {
  private _actions$ = inject(Actions);
  private _store = inject(Store);
  private _persistenceService = inject(PersistenceService);

  syncProjectToLs$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          // meta
          deleteProject,

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
        switchMap(() => this.saveToLs$(true)),
      ),
    { dispatch: false },
  );

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
