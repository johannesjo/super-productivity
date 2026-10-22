import { Injectable } from '@angular/core';

/**
 * Issues whose task was deleted locally while their remote delete waits out
 * the undo window. The item is still on the remote and the task is gone, so a
 * backlog poll would import it again; the import skips these. In memory only,
 * like the deferred delete itself.
 */
@Injectable({ providedIn: 'root' })
export class PendingRemoteIssueDeleteService {
  private readonly _keys = new Set<string>();

  add(issueProviderId: string, issueId: string): void {
    this._keys.add(key(issueProviderId, issueId));
  }

  remove(issueProviderId: string, issueId: string): void {
    this._keys.delete(key(issueProviderId, issueId));
  }

  has(issueProviderId: string, issueId: string): boolean {
    return this._keys.has(key(issueProviderId, issueId));
  }
}

const key = (issueProviderId: string, issueId: string): string =>
  `${issueProviderId}\n${issueId}`;
