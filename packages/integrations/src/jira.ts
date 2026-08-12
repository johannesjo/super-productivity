import { IntegrationHttpError, requestJson, type AuthScheme } from './http';
import type { RemoteComment, RemoteIssue, RemoteWorklog } from './transforms';
import { normalizePriority } from './transforms';

// Compiled-in Jira adapter: a typed REST client over the framework-free http
// helper. Uses the server's JSON format; mocks/tests exercise the pipeline.

export interface JiraConfig {
  baseUrl: string;
  auth: AuthScheme;
  fetch?: typeof globalThis.fetch;
}

interface JiraIssue {
  id: string;
  key: string;
  fields?: {
    summary?: string;
    description?: string;
    status?: { name?: string };
    assignee?: { displayName?: string };
    reporter?: { displayName?: string };
    priority?: { name?: string };
    created?: string;
    updated?: string;
  };
  self?: string;
}

const toRemoteIssue = (issue: JiraIssue): RemoteIssue => ({
  id: issue.id,
  key: issue.key,
  title: issue.fields?.summary ?? issue.key,
  description: fromJiraDescription(issue.fields?.description),
  state: issue.fields?.status?.name ?? 'Open',
  priority: normalizePriority(issue.fields?.priority?.name ?? 0),
  assignee: issue.fields?.assignee?.displayName,
  reporter: issue.fields?.reporter?.displayName,
  url: issue.self ?? '',
  createdAt: issue.fields?.created ?? '',
  updatedAt: issue.fields?.updated ?? '',
});

/** Jira ADF -> simplified markdown-ish text (fragments only). */
export const fromJiraDescription = (value: unknown): string => {
  if (!value || typeof value !== 'object') return typeof value === 'string' ? value : '';
  const node = value as { content?: unknown[]; text?: string; type?: string };
  if (node.type === 'text' && typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    const parts = node.content.map((child) => fromJiraDescription(child)).filter(Boolean);
    if (node.type === 'paragraph') return parts.join(' ');
    if (node.type === 'listItem') return `- ${parts.join(' ')}`;
    return parts.join('\n');
  }
  return '';
};

export class JiraClient {
  readonly #config: JiraConfig;

  constructor(config: JiraConfig) {
    this.#config = config;
  }

  #http = <T>(path: string, method: 'GET' | 'POST' = 'GET', json?: unknown) =>
    requestJson<T>({
      baseUrl: this.#config.baseUrl,
      path,
      auth: this.#config.auth,
      method,
      json,
      fetch: this.#config.fetch,
    });

  async search(jql: string, maxResults = 100): Promise<RemoteIssue[]> {
    const { body } = await this.#http<{ issues?: JiraIssue[] }>(
      `/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`,
    );
    return (body.issues ?? []).map(toRemoteIssue);
  }

  async get(keyOrId: string): Promise<RemoteIssue> {
    const { body } = await this.#http<JiraIssue>(
      `/rest/api/2/issue/${encodeURIComponent(keyOrId)}`,
    );
    return toRemoteIssue(body);
  }

  async addComment(keyOrId: string, bodyText: string): Promise<RemoteComment> {
    const { body } = await this.#http<{
      id: string;
      body: string;
      author?: { displayName?: string };
      created?: string;
    }>(`/rest/api/2/issue/${encodeURIComponent(keyOrId)}/comment`, 'POST', {
      body: bodyText,
    });
    return {
      id: body.id,
      author: body.author?.displayName ?? '',
      body: body.body,
      createdAt: body.created ?? '',
    };
  }

  async worklogs(keyOrId: string): Promise<RemoteWorklog[]> {
    const { body } = await this.#http<{
      worklogs?: Array<{
        id: string;
        author?: { displayName?: string };
        started?: string;
        timeSpentSeconds?: number;
        comment?: string;
      }>;
    }>(`/rest/api/2/issue/${encodeURIComponent(keyOrId)}/worklog`);
    return (body.worklogs ?? []).map((entry) => ({
      id: entry.id,
      author: entry.author?.displayName ?? '',
      startedAt: entry.started ?? '',
      timeSpentSeconds: entry.timeSpentSeconds ?? 0,
      comment: entry.comment,
    }));
  }

  /** Connection probe used by Settings → Save connection. */
  async testConnection(): Promise<boolean> {
    try {
      await this.#http<{ id?: string }>('/rest/api/2/serverInfo');
      return true;
    } catch (error) {
      if (error instanceof IntegrationHttpError && error.status !== 401) return false;
      return false;
    }
  }
}
