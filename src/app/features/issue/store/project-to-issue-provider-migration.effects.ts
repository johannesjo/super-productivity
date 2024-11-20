import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { filter, tap } from 'rxjs/operators';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { Project } from '../../project/project.model';
import { IssueProvider } from '../issue.model';
import { Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { IssueProviderActions } from './issue-provider.actions';

@Injectable()
export class ProjectToIssueProviderMigrationEffects {
  migrate$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(loadAllData),
        filter((a) => a.appDataComplete.issueProvider.ids.length === 0),
        tap(({ appDataComplete }) => {
          if (appDataComplete.project.ids.length > 0) {
            Object.values(appDataComplete.project.entities).forEach((project): void => {
              if (project) {
                this._addIssueProvidersForProject(project);
              }
            });
          }
        }),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _store: Store,
  ) {}

  private _addIssueProvidersForProject(project: Project): void {
    Object.entries(project.issueIntegrationCfgs).forEach(([key, value]) => {
      if (value) {
        const issueProvider = {
          issueProviderKey: key,
          migratedFromProjectId: project.id,
          defaultProjectId: project.id,
          id: nanoid(),
          isEnabled: value.isEnabled && !project.isHiddenFromMenu,
          ...value,
        } as IssueProvider;
        console.log('Migrating issue provider from project', key, issueProvider);
        this._store.dispatch(
          IssueProviderActions.addIssueProvider({
            issueProvider,
          }),
        );
      }
    });
  }
}
