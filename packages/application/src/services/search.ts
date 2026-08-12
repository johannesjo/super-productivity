import type { DomainState, Task } from '@noura/domain';

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
export const searchDomain = (
  state: DomainState,
  rawQuery: string,
  options: SearchOptions = {},
): SearchResult[] => {
  const limit = options.limit ?? 8;
  const minScore = options.minScore ?? 0;
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const results: SearchResult[] = [];
  const push = (result: SearchResult): void => {
    results.push(result);
  };
  const score = (title: string, subtitle = ''): number => {
    const haystack = `${title} ${subtitle}`.toLowerCase();
    if (haystack === query) return 100;
    if (haystack.startsWith(query)) return 80;
    const index = haystack.indexOf(query);
    if (index >= 0) return 60 - Math.min(20, index);
    const words = query.split(/\s+/);
    const matched = words.filter((word) => haystack.includes(word)).length;
    if (matched > 0) return matched * 10;
    return 0;
  };

  for (const task of Object.values(state.tasks) as Task[]) {
    const taskScore = score(task.title, task.notes);
    if (taskScore < minScore) continue;
    push({
      kind: 'task',
      id: task.id,
      title: task.title,
      subtitle: task.status === 'done' ? 'Completed' : task.projectId,
      score: taskScore,
    });
  }

  for (const note of Object.values(state.notes)) {
    const noteScore = score(note.content, note.projectId);
    if (noteScore < minScore) continue;
    const title = note.content.split('\n')[0].trim().slice(0, 60) || 'Note';
    push({
      kind: 'note',
      id: note.id,
      title,
      subtitle: note.projectId,
      score: noteScore,
    });
  }

  for (const tag of Object.values(state.tags)) {
    const tagScore = score(tag.title);
    if (tagScore < minScore) continue;
    push({ kind: 'tag', id: tag.id, title: tag.title, score: tagScore });
  }

  for (const project of Object.values(state.projects)) {
    const projectScore = score(project.title);
    if (projectScore < minScore) continue;
    push({
      kind: 'project',
      id: project.id,
      title: project.title,
      score: projectScore,
    });
  }

  return results
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, limit);
};

/** Prebuilt index wrapper for consumers that want a persistent search handle. */
export class DomainSearchIndex {
  readonly #index: () => DomainState;
  constructor(state: () => DomainState) {
    this.#index = state;
  }
  search(query: string, options?: SearchOptions): SearchResult[] {
    return searchDomain(this.#index(), query, options);
  }
}
