export type IntegrationKind = 'issues' | 'calendar' | 'tasks';
export interface IntegrationDefinition {
    id: string;
    title: string;
    kind: IntegrationKind;
    auth: 'token' | 'oauth2' | 'basic' | 'none';
    capabilities: readonly ('import' | 'create' | 'update' | 'comment' | 'events')[];
}
export declare const INTEGRATIONS: readonly [{
    readonly id: "jira";
    readonly title: "Jira";
    readonly kind: "issues";
    readonly auth: "token";
    readonly capabilities: readonly ["import", "create", "update", "comment"];
}, {
    readonly id: "gitlab";
    readonly title: "GitLab";
    readonly kind: "issues";
    readonly auth: "token";
    readonly capabilities: readonly ["import", "create", "update", "comment"];
}, {
    readonly id: "github";
    readonly title: "GitHub";
    readonly kind: "issues";
    readonly auth: "token";
    readonly capabilities: readonly ["import", "create", "update", "comment"];
}, {
    readonly id: "gitea";
    readonly title: "Gitea / Forgejo";
    readonly kind: "issues";
    readonly auth: "token";
    readonly capabilities: readonly ["import", "create", "update", "comment"];
}, {
    readonly id: "trello";
    readonly title: "Trello";
    readonly kind: "tasks";
    readonly auth: "oauth2";
    readonly capabilities: readonly ["import", "create", "update"];
}, {
    readonly id: "linear";
    readonly title: "Linear";
    readonly kind: "issues";
    readonly auth: "oauth2";
    readonly capabilities: readonly ["import", "create", "update", "comment"];
}, {
    readonly id: "clickup";
    readonly title: "ClickUp";
    readonly kind: "tasks";
    readonly auth: "token";
    readonly capabilities: readonly ["import", "create", "update", "comment"];
}, {
    readonly id: "azure-devops";
    readonly title: "Azure DevOps";
    readonly kind: "issues";
    readonly auth: "token";
    readonly capabilities: readonly ["import", "create", "update", "comment"];
}, {
    readonly id: "openproject";
    readonly title: "OpenProject";
    readonly kind: "issues";
    readonly auth: "token";
    readonly capabilities: readonly ["import", "create", "update", "comment"];
}, {
    readonly id: "redmine";
    readonly title: "Redmine";
    readonly kind: "issues";
    readonly auth: "token";
    readonly capabilities: readonly ["import", "create", "update", "comment"];
}, {
    readonly id: "nextcloud-deck";
    readonly title: "Nextcloud Deck";
    readonly kind: "tasks";
    readonly auth: "basic";
    readonly capabilities: readonly ["import", "create", "update"];
}, {
    readonly id: "plainspace";
    readonly title: "Plainspace";
    readonly kind: "tasks";
    readonly auth: "token";
    readonly capabilities: readonly ["import", "create", "update"];
}, {
    readonly id: "ical";
    readonly title: "iCalendar";
    readonly kind: "calendar";
    readonly auth: "none";
    readonly capabilities: readonly ["import", "events"];
}, {
    readonly id: "caldav";
    readonly title: "CalDAV";
    readonly kind: "calendar";
    readonly auth: "basic";
    readonly capabilities: readonly ["import", "create", "update", "events"];
}, {
    readonly id: "google-calendar";
    readonly title: "Google Calendar";
    readonly kind: "calendar";
    readonly auth: "oauth2";
    readonly capabilities: readonly ["import", "create", "update", "events"];
}];
export declare const integrationById: (id: string) => IntegrationDefinition | undefined;
export * from './clients';
