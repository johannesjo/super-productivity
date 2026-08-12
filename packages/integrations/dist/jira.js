import { IntegrationHttpError, requestJson } from './http';
import { normalizePriority } from './transforms';
const toRemoteIssue = (issue) => ({
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
export const fromJiraDescription = (value) => {
    if (!value || typeof value !== 'object')
        return typeof value === 'string' ? value : '';
    const node = value;
    if (node.type === 'text' && typeof node.text === 'string')
        return node.text;
    if (Array.isArray(node.content)) {
        const parts = node.content.map((child) => fromJiraDescription(child)).filter(Boolean);
        if (node.type === 'paragraph')
            return parts.join(' ');
        if (node.type === 'listItem')
            return `- ${parts.join(' ')}`;
        return parts.join('\n');
    }
    return '';
};
export class JiraClient {
    #config;
    constructor(config) {
        this.#config = config;
    }
    #http = (path, method = 'GET', json) => requestJson({
        baseUrl: this.#config.baseUrl,
        path,
        auth: this.#config.auth,
        method,
        json,
        fetch: this.#config.fetch,
    });
    async search(jql, maxResults = 100) {
        const { body } = await this.#http(`/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`);
        return (body.issues ?? []).map(toRemoteIssue);
    }
    async get(keyOrId) {
        const { body } = await this.#http(`/rest/api/2/issue/${encodeURIComponent(keyOrId)}`);
        return toRemoteIssue(body);
    }
    async addComment(keyOrId, bodyText) {
        const { body } = await this.#http(`/rest/api/2/issue/${encodeURIComponent(keyOrId)}/comment`, 'POST', {
            body: bodyText,
        });
        return {
            id: body.id,
            author: body.author?.displayName ?? '',
            body: body.body,
            createdAt: body.created ?? '',
        };
    }
    async worklogs(keyOrId) {
        const { body } = await this.#http(`/rest/api/2/issue/${encodeURIComponent(keyOrId)}/worklog`);
        return (body.worklogs ?? []).map((entry) => ({
            id: entry.id,
            author: entry.author?.displayName ?? '',
            startedAt: entry.started ?? '',
            timeSpentSeconds: entry.timeSpentSeconds ?? 0,
            comment: entry.comment,
        }));
    }
    /** Connection probe used by Settings → Save connection. */
    async testConnection() {
        try {
            await this.#http('/rest/api/2/serverInfo');
            return true;
        }
        catch (error) {
            if (error instanceof IntegrationHttpError && error.status !== 401)
                return false;
            return false;
        }
    }
}
