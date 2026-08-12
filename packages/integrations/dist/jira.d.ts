import { type AuthScheme } from './http';
import type { RemoteComment, RemoteIssue, RemoteWorklog } from './transforms';
export interface JiraConfig {
    baseUrl: string;
    auth: AuthScheme;
    fetch?: typeof globalThis.fetch;
}
/** Jira ADF -> simplified markdown-ish text (fragments only). */
export declare const fromJiraDescription: (value: unknown) => string;
export declare class JiraClient {
    #private;
    constructor(config: JiraConfig);
    search(jql: string, maxResults?: number): Promise<RemoteIssue[]>;
    get(keyOrId: string): Promise<RemoteIssue>;
    addComment(keyOrId: string, bodyText: string): Promise<RemoteComment>;
    worklogs(keyOrId: string): Promise<RemoteWorklog[]>;
    /** Connection probe used by Settings → Save connection. */
    testConnection(): Promise<boolean>;
}
