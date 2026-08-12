export type IntegrationKind = 'issues' | 'calendar' | 'tasks';
export interface IntegrationDefinition {
  id: string;
  title: string;
  kind: IntegrationKind;
  auth: 'token' | 'oauth2' | 'basic' | 'none';
  capabilities: readonly ('import' | 'create' | 'update' | 'comment' | 'events')[];
}

export const INTEGRATIONS = [
  {
    id: 'jira',
    title: 'Jira',
    kind: 'issues',
    auth: 'token',
    capabilities: ['import', 'create', 'update', 'comment'],
  },
  {
    id: 'gitlab',
    title: 'GitLab',
    kind: 'issues',
    auth: 'token',
    capabilities: ['import', 'create', 'update', 'comment'],
  },
  {
    id: 'github',
    title: 'GitHub',
    kind: 'issues',
    auth: 'token',
    capabilities: ['import', 'create', 'update', 'comment'],
  },
  {
    id: 'gitea',
    title: 'Gitea / Forgejo',
    kind: 'issues',
    auth: 'token',
    capabilities: ['import', 'create', 'update', 'comment'],
  },
  {
    id: 'trello',
    title: 'Trello',
    kind: 'tasks',
    auth: 'oauth2',
    capabilities: ['import', 'create', 'update'],
  },
  {
    id: 'linear',
    title: 'Linear',
    kind: 'issues',
    auth: 'oauth2',
    capabilities: ['import', 'create', 'update', 'comment'],
  },
  {
    id: 'clickup',
    title: 'ClickUp',
    kind: 'tasks',
    auth: 'token',
    capabilities: ['import', 'create', 'update', 'comment'],
  },
  {
    id: 'azure-devops',
    title: 'Azure DevOps',
    kind: 'issues',
    auth: 'token',
    capabilities: ['import', 'create', 'update', 'comment'],
  },
  {
    id: 'openproject',
    title: 'OpenProject',
    kind: 'issues',
    auth: 'token',
    capabilities: ['import', 'create', 'update', 'comment'],
  },
  {
    id: 'redmine',
    title: 'Redmine',
    kind: 'issues',
    auth: 'token',
    capabilities: ['import', 'create', 'update', 'comment'],
  },
  {
    id: 'nextcloud-deck',
    title: 'Nextcloud Deck',
    kind: 'tasks',
    auth: 'basic',
    capabilities: ['import', 'create', 'update'],
  },
  {
    id: 'plainspace',
    title: 'Plainspace',
    kind: 'tasks',
    auth: 'token',
    capabilities: ['import', 'create', 'update'],
  },
  {
    id: 'ical',
    title: 'iCalendar',
    kind: 'calendar',
    auth: 'none',
    capabilities: ['import', 'events'],
  },
  {
    id: 'caldav',
    title: 'CalDAV',
    kind: 'calendar',
    auth: 'basic',
    capabilities: ['import', 'create', 'update', 'events'],
  },
  {
    id: 'google-calendar',
    title: 'Google Calendar',
    kind: 'calendar',
    auth: 'oauth2',
    capabilities: ['import', 'create', 'update', 'events'],
  },
] as const satisfies readonly IntegrationDefinition[];

export const integrationById = (id: string): IntegrationDefinition | undefined =>
  INTEGRATIONS.find((integration) => integration.id === id);

export * from './clients';
