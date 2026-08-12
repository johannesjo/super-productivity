import type { DomainCommand, TrackedEntry } from '@noura/domain';
import type { IdlePort } from './ports';

export interface IdleDetectionOptions {
  idle: IdlePort;
  /** Whether idle detection and idle-split is enabled (from GlobalConfig). */
  isEnabled: () => boolean;
}

export interface IdleDecision {
  /** The active entry should be suspended (fixed end at last active). */
  suspend: { entryId: string; lastActiveAt: number };
}

/**
 * Polls idle state and, when the user exceeds the idle threshold while an
 * entry is active, returns a suspend decision so the caller can split the
 * tracked entry (fixed end) and resume it later (fixed start). Framework-free;
 * the caller adapts to a real activity monitor.
 */
export class IdleDetection {
  readonly #idle: IdlePort;
  readonly #isEnabled: () => boolean;
  #lastDecisionAt = 0;

  constructor(options: IdleDetectionOptions) {
    this.#idle = options.idle;
    this.#isEnabled = options.isEnabled;
  }

  /** True when the user has been idle past the threshold. */
  async isIdlePast(idleThresholdMs: number, observedAt = Date.now()): Promise<boolean> {
    if (!this.#isEnabled() || idleThresholdMs <= 0) return false;
    const idleMs = await this.#idle.getIdleMs();
    return idleMs >= idleThresholdMs;
  }

  /**
   * Builds the deterministic command batch that splits a running entry around
   * an idle gap: finalize the original entry at `lastActiveAt`, then open a
   * continuation entry when the user is active again (`resumedAt`). Both
   * timestamps come from the caller's activity monitor.
   */
  static splitCommands(
    entry: TrackedEntry,
    lastActiveAt: number,
    resumedAt: number,
  ): DomainCommand[] {
    if (resumedAt <= lastActiveAt || lastActiveAt < entry.startedAt) return [];
    return [
      {
        type: 'session/stop',
        payload: {
          id: entry.id,
          endedAt: lastActiveAt,
          durationMs: lastActiveAt - entry.startedAt,
        },
      },
      {
        type: 'session/manual',
        payload: {
          entry: {
            id: `${entry.id}-idle`,
            taskId: entry.taskId,
            mode: entry.mode,
            startedAt: resumedAt,
            endedAt: undefined,
            durationMs: 0,
            source: 'timer',
            updatedAt: resumedAt,
          },
        },
      },
    ];
  }
}
