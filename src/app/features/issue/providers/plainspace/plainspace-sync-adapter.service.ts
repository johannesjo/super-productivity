import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IssueSyncAdapter } from '../../two-way-sync/issue-sync-adapter.interface';
import {
  FieldMapping,
  FieldSyncConfig,
  IssueSyncPushError,
} from '../../two-way-sync/issue-sync.model';
import { T } from '../../../../t.const';
import { PlainspaceCfg } from './plainspace.model';
import { PlainspaceApiService, PlainspaceTaskPatch } from './plainspace-api.service';
import { PlainspaceConnectionStateService } from './plainspace-connection-state.service';

/** Plainspace's item text limit (`MAX_ITEM_TEXT_LENGTH`), in UTF-16 units. */
export const PLAINSPACE_MAX_TITLE_LENGTH = 500;

/**
 * Field mappings between Super Productivity and Plainspace:
 * - `isDone` → `done`
 * - `title` → `title`
 * - `dueWithTime` → `scheduledAt`
 *
 * Completion and title sync both ways. The schedule is pulled from Plainspace
 * by issue-update polling only.
 *
 * `dueDay` (date-only scheduling, no time) is intentionally NOT mapped: Plainspace
 * `scheduledAt` always carries a time, so mapping a day-only task would fabricate
 * a time-of-day. There is no separate day field on Plainspace to clear, so no
 * `mutuallyExclusive` entry is needed.
 */
const PLAINSPACE_FIELD_MAPPINGS: FieldMapping[] = [
  {
    taskField: 'isDone',
    issueField: 'isDone',
    defaultDirection: 'both',
    toIssueValue: (taskValue: unknown): boolean => !!taskValue,
    toTaskValue: (issueValue: unknown): boolean => !!issueValue,
  },
  {
    taskField: 'title',
    issueField: 'title',
    defaultDirection: 'both',
    toIssueValue: (taskValue: unknown): string => (taskValue as string) ?? '',
    toTaskValue: (issueValue: unknown): string => (issueValue as string) ?? '',
  },
  {
    taskField: 'dueWithTime',
    issueField: 'scheduledAt',
    defaultDirection: 'pullOnly',
    toIssueValue: (taskValue: unknown): string | null =>
      typeof taskValue === 'number' ? new Date(taskValue).toISOString() : null,
    // "No time" is null, not undefined: JSON keeps a null in the op, so the
    // clear reaches my other devices, released ones too (#9776).
    toTaskValue: (issueValue: unknown): number | null =>
      typeof issueValue === 'string' ? new Date(issueValue).getTime() : null,
  },
];

/**
 * Two-way sync adapter for Plainspace: writes completion and title back and
 * leaves the Plainspace-owned schedule to the polling path.
 */
@Injectable({ providedIn: 'root' })
export class PlainspaceSyncAdapterService implements IssueSyncAdapter<PlainspaceCfg> {
  private readonly _api = inject(PlainspaceApiService);
  private readonly _connectionState = inject(PlainspaceConnectionStateService);

  getFieldMappings(): FieldMapping[] {
    return PLAINSPACE_FIELD_MAPPINGS;
  }

  getSyncConfig(cfg: PlainspaceCfg): FieldSyncConfig {
    // A server too old for titles keeps the title pull-only for the session.
    const providerId = getProviderId(cfg);
    const isTitleUnsupported =
      !!providerId && this._connectionState.isTitleUnsupported(providerId);
    return {
      isDone: 'both',
      title: isTitleUnsupported ? 'pullOnly' : 'both',
      dueWithTime: 'pullOnly',
    };
  }

  /**
   * Creates the task in Plainspace when it is first added to a Plainspace-backed
   * project (via the generic `autoCreateIssueOnTaskAdd$` effect), then hands the
   * created issue back so the effect can link it and seed the two-way-sync
   * baseline. No `issueNumber`: Plainspace tasks have no numeric id, so the SP
   * title stays as typed (no `#123` prefix).
   */
  async createIssue(
    title: string,
    cfg: PlainspaceCfg,
  ): Promise<{ issueId: string; issueData: Record<string, unknown> }> {
    const issue = await firstValueFrom(this._api.createTask$(title, cfg));
    return {
      issueId: issue.id,
      issueData: issue as Record<string, unknown>,
    };
  }

  /**
   * Deletes the task in Plainspace when its SP task is deleted (via the generic
   * `deleteIssueOnTaskDelete$` effects, after the undo window). Without this the
   * next poll re-imports the still-assigned task, so it can never be deleted.
   */
  async deleteIssue(issueId: string, cfg: PlainspaceCfg): Promise<void> {
    await firstValueFrom(this._api.deleteTask$(issueId, cfg));
  }

  async fetchIssue(
    issueId: string,
    cfg: PlainspaceCfg,
  ): Promise<Record<string, unknown>> {
    const issue = await firstValueFrom(this._api.getById$(issueId, cfg));
    return (issue ?? {}) as unknown as Record<string, unknown>;
  }

  /**
   * PATCHes completion and title. The server stores the title verbatim, so the
   * echo must match exactly. A server from before titles were accepted answers
   * a request carrying one with a 422 (no `done` next to it) or ignores it (200
   * with the old title): titles then stop being pushed to that provider for the
   * session, done is sent on its own, and the rejection is an expected skip, so
   * baselines stay put and the next poll reconciles.
   */
  async pushChanges(
    issueId: string,
    changes: Record<string, unknown>,
    cfg: PlainspaceCfg,
  ): Promise<void | Record<string, unknown>> {
    const patch: PlainspaceTaskPatch = {};
    if ('isDone' in changes) {
      patch.done = !!changes['isDone'];
    }
    // A title Plainspace can't take is not sent; done still is, then the task
    // shows why its title didn't sync.
    const titleErrorKey = 'title' in changes ? invalidTitleKey(changes['title']) : null;
    if ('title' in changes && !titleErrorKey) {
      patch.title = changes['title'] as string;
    }
    if (patch.done === undefined && patch.title === undefined) {
      if (titleErrorKey) {
        throw new IssueSyncPushError(titleErrorKey);
      }
      return;
    }

    let updated;
    try {
      updated = await firstValueFrom(this._api.patchTask$(issueId, patch, cfg));
    } catch (err) {
      if (patch.title !== undefined && httpStatus(err) === 422) {
        return this._onTitleUnsupported(issueId, patch, cfg);
      }
      throw err;
    }
    assertEchoed(issueId, patch.done, updated);
    if (patch.title !== undefined && updated?.title !== patch.title) {
      return this._onTitleUnsupported(issueId, { done: patch.done }, cfg, true);
    }
    if (titleErrorKey) {
      // Done was written, but its baseline only moves with a full success:
      // the next poll sees the remote change and pulls the same value.
      throw new IssueSyncPushError(titleErrorKey);
    }
    // The row as written: its updatedAt is the marker of our own write. A
    // re-fetch could already carry a later change by someone else.
    return updated?.updatedAt ? { updatedAt: updated.updatedAt } : undefined;
  }

  private async _onTitleUnsupported(
    issueId: string,
    patch: PlainspaceTaskPatch,
    cfg: PlainspaceCfg,
    isDoneApplied = false,
  ): Promise<never> {
    const providerId = getProviderId(cfg);
    if (providerId) {
      this._connectionState.reportTitleUnsupported(providerId);
    }
    if (patch.done !== undefined && !isDoneApplied) {
      const updated = await firstValueFrom(
        this._api.patchTask$(issueId, { done: patch.done }, cfg),
      );
      assertEchoed(issueId, patch.done, updated);
    }
    throw { isExpectedSyncSkip: true, reason: 'plainspace-title-unsupported' };
  }

  extractSyncValues(issue: Record<string, unknown>): Record<string, unknown> {
    // Completion needs a push baseline; title and schedule remain in the same
    // remote baseline so polling can identify provider-owned changes.
    return {
      isDone: issue['isDone'],
      title: issue['title'],
      scheduledAt: issue['scheduledAt'],
    };
  }

  getIssueLastUpdated(issue: Record<string, unknown>): number {
    const updatedAt = issue['updatedAt'];
    return updatedAt ? new Date(updatedAt as string).getTime() : 0;
  }
}

const getProviderId = (cfg: PlainspaceCfg): string | undefined =>
  (cfg as { id?: string }).id;

const httpStatus = (err: unknown): number | undefined =>
  err instanceof HttpErrorResponse ? err.status : undefined;

/**
 * Why Plainspace would refuse this title, or null: it takes 1–500 characters
 * and refuses a blank title.
 */
const invalidTitleKey = (title: unknown): string | null => {
  if (typeof title !== 'string' || !title.trim()) {
    return T.PLAINSPACE.SYNC.ERR_TITLE_EMPTY;
  }
  if (title.length > PLAINSPACE_MAX_TITLE_LENGTH) {
    return T.PLAINSPACE.SYNC.ERR_TITLE_TOO_LONG;
  }
  return null;
};

const assertEchoed = (
  issueId: string,
  done: boolean | undefined,
  updated: { id: string; isDone: boolean } | null,
): void => {
  if (
    !updated ||
    updated.id !== issueId ||
    (done !== undefined && updated.isDone !== done)
  ) {
    throw new Error('Plainspace update failed');
  }
};
