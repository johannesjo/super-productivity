import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { IssueProvider } from '../issue.model';

/* eslint-disable @typescript-eslint/naming-convention */

export const IssueProviderActions = createActionGroup({
  source: 'IssueProvider/API',
  events: {
    'Load IssueProviders': props<{ issueProviders: IssueProvider[] }>(),
    'Add IssueProvider': props<{ issueProvider: IssueProvider }>(),
    'Upsert IssueProvider': props<{ issueProvider: IssueProvider }>(),
    'Add IssueProviders': props<{ issueProviders: IssueProvider[] }>(),
    'Upsert IssueProviders': props<{ issueProviders: IssueProvider[] }>(),
    'Update IssueProvider': props<{ issueProvider: Update<IssueProvider> }>(),
    'Update IssueProviders': props<{ issueProviders: Update<IssueProvider>[] }>(),
    'Sort IssueProviders First': props<{ ids: string[] }>(),
    'Delete IssueProvider': props<{ id: string }>(),
    'Delete IssueProviders': props<{ ids: string[] }>(),
    'Clear IssueProviders': emptyProps(),
  },
});
