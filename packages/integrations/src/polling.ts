import type { RemoteIssue } from './transforms';

// Framework-free polling for pinned searches (Phase 7): dedupe by issue id so
// repeated polls only surface genuinely new items. Callers choose the cadence;
// `isEnabled` lets the caller pause polling without losing the known set.

export interface IssuePollerOptions {
  fetch: () => Promise<RemoteIssue[]>;
  onNew: (issues: RemoteIssue[]) => void;
  isEnabled?: () => boolean;
}

export class IssuePoller {
  readonly #known = new Set<string>();
  readonly #fetch: () => Promise<RemoteIssue[]>;
  readonly #onNew: (issues: RemoteIssue[]) => void;
  readonly #isEnabled: () => boolean;

  constructor(options: IssuePollerOptions) {
    this.#fetch = options.fetch;
    this.#onNew = options.onNew;
    this.#isEnabled = options.isEnabled ?? (() => true);
  }

  /** Polls once; returns the genuinely new issues and emits them. */
  async poll(): Promise<RemoteIssue[]> {
    if (!this.#isEnabled()) return [];
    const issues = await this.#fetch();
    const fresh = issues.filter((issue) => !this.#known.has(issue.id));
    for (const issue of issues) this.#known.add(issue.id);
    if (fresh.length) this.#onNew(fresh);
    return fresh;
  }

  /** Seed the known set (e.g. from the first backlog import) without emitting. */
  seed(ids: string[]): void {
    for (const id of ids) this.#known.add(id);
  }

  knownCount(): number {
    return this.#known.size;
  }

  forget(id: string): void {
    this.#known.delete(id);
  }
}
