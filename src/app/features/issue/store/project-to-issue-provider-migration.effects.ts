import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { filter, tap } from 'rxjs/operators';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { Project } from '../../project/project.model';
import { IssueIntegrationCfg, IssueProvider, IssueProviderKey } from '../issue.model';
import { Store } from '@ngrx/store';
import { nanoid } from 'nanoid';
import { IssueProviderActions } from './issue-provider.actions';
import { DEFAULT_ISSUE_PROVIDER_CFGS, ISSUE_PROVIDER_TYPES } from '../issue.const';
import { JiraCfg } from '../providers/jira/jira.model';
import { GithubCfg } from '../providers/github/github.model';
import { OpenProjectCfg } from '../providers/open-project/open-project.model';
import { CaldavCfg } from '../providers/caldav/caldav.model';
import { RedmineCfg } from '../providers/redmine/redmine.model';
import { GiteaCfg } from '../providers/gitea/gitea.model';
import { GitlabCfg } from '../providers/gitlab/gitlab';

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
    let count = 0;
    if (!project.issueIntegrationCfgs) {
      return;
    }

    Object.entries(project.issueIntegrationCfgs).forEach(([key, value]) => {
      if (this._isMigrateIssueProvider(value, key as IssueProviderKey)) {
        count++;
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

    if (count) {
      alert(`Migrated ${count} issue providers for project ${project.title}`);
    }
  }

  private _isMigrateIssueProvider(
    fromProject: IssueIntegrationCfg,
    issueProviderKey: IssueProviderKey,
  ): boolean {
    if (!ISSUE_PROVIDER_TYPES.includes(issueProviderKey) || !fromProject) {
      return false;
    }

    if (issueProviderKey === 'JIRA' && (fromProject as JiraCfg).host === null) {
      return false;
    }

    if (
      issueProviderKey === 'OPEN_PROJECT' &&
      (fromProject as OpenProjectCfg).host === null
    ) {
      return false;
    }

    if (issueProviderKey === 'CALDAV' && (fromProject as CaldavCfg).caldavUrl === null) {
      return false;
    }

    if (issueProviderKey === 'REDMINE' && (fromProject as RedmineCfg).host === null) {
      return false;
    }

    if (issueProviderKey === 'GITHUB' && (fromProject as GithubCfg).repo === null) {
      return false;
    }

    if (issueProviderKey === 'GITEA' && (fromProject as GiteaCfg).repoFullname === null) {
      return false;
    }

    if (issueProviderKey === 'GITLAB' && (fromProject as GitlabCfg).project === null) {
      return false;
    }

    const defaultCfg = DEFAULT_ISSUE_PROVIDER_CFGS[issueProviderKey];
    // check if at least two properties are different
    const diffProps = Object.keys(fromProject).filter(
      (key) => fromProject[key] !== defaultCfg[key],
    );
    console.log(issueProviderKey, diffProps, fromProject, defaultCfg);

    return diffProps.length >= 2;
  }
}
