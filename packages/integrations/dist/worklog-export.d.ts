import type { DomainState } from '@noura/domain';
export interface IssueWorklogEntry {
    issueKey: string;
    author: string;
    startedAt: string;
    timeSpentSeconds: number;
    comment?: string;
}
export declare const buildIssueWorklogs: (state: DomainState, providerId: string) => IssueWorklogEntry[];
export declare const worklogToJiraPayload: (entry: IssueWorklogEntry) => unknown;
