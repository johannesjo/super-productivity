import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Which Plainspace providers had their token rejected (401/403) on the last
 * request, so the issue panel can ask the user to reconnect. In memory only —
 * never persisted or synced: the next successful poll clears it, and a restart
 * starts clean.
 */
@Injectable({ providedIn: 'root' })
export class PlainspaceConnectionStateService {
  private readonly _rejectedProviderIds = signal<ReadonlySet<string>>(new Set());

  readonly rejectedProviderIds = this._rejectedProviderIds.asReadonly();

  /** A request for this provider succeeded: its token works. */
  reportSuccess(providerId: string): void {
    this.clear([providerId]);
  }

  /**
   * A request for this provider failed. Only a rejected token changes the
   * state; offline and server errors say nothing about the token.
   */
  reportError(providerId: string, err: unknown): void {
    if (isPlainspaceAuthError(err) && !this._rejectedProviderIds().has(providerId)) {
      this._rejectedProviderIds.update((ids) => new Set(ids).add(providerId));
    }
  }

  clear(providerIds: string[]): void {
    if (!providerIds.some((id) => this._rejectedProviderIds().has(id))) {
      return;
    }
    this._rejectedProviderIds.update((ids) => {
      const next = new Set(ids);
      providerIds.forEach((id) => next.delete(id));
      return next;
    });
  }
}

/** Plainspace gave a verdict on the token: it is revoked, expired or wrong. */
export const isPlainspaceAuthError = (err: unknown): boolean =>
  err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403);

/**
 * No answer from Plainspace (offline, DNS, TLS, timeout) or a server-side
 * failure. Retrying on the next poll is the right response, not a message.
 */
export const isPlainspaceUnreachableError = (err: unknown): boolean =>
  err instanceof HttpErrorResponse && (err.status === 0 || err.status >= 500);
