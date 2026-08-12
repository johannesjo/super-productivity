import type { DomainState } from '@noura/domain';
export type SearchKind = 'task' | 'note' | 'tag' | 'project' | 'tracked' | 'action';
export interface SearchResult {
    kind: SearchKind;
    id: string;
    title: string;
    subtitle?: string;
    score: number;
}
export interface SearchOptions {
    limit?: number;
    minScore?: number;
}
/**
 * Framework-free full-text search across tasks, notes, tags, and projects.
 * Matching is case-insensitive substring scoring with word-prefix bonus; the
 * result list is deterministic (score desc, then id) so tests are stable.
 */
export declare const searchDomain: (state: DomainState, rawQuery: string, options?: SearchOptions) => SearchResult[];
/** Prebuilt index wrapper for consumers that want a persistent search handle. */
export declare class DomainSearchIndex {
    #private;
    constructor(state: () => DomainState);
    search(query: string, options?: SearchOptions): SearchResult[];
}
