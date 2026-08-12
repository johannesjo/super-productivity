/**
 * Polls idle state and, when the user exceeds the idle threshold while an
 * entry is active, returns a suspend decision so the caller can split the
 * tracked entry (fixed end) and resume it later (fixed start). Framework-free;
 * the caller adapts to a real activity monitor.
 */
export class IdleDetection {
    #idle;
    #isEnabled;
    #lastDecisionAt = 0;
    constructor(options) {
        this.#idle = options.idle;
        this.#isEnabled = options.isEnabled;
    }
    /** True when the user has been idle past the threshold. */
    async isIdlePast(idleThresholdMs, observedAt = Date.now()) {
        if (!this.#isEnabled() || idleThresholdMs <= 0)
            return false;
        const idleMs = await this.#idle.getIdleMs();
        return idleMs >= idleThresholdMs;
    }
    /**
     * Builds the deterministic command batch that splits a running entry around
     * an idle gap: finalize the original entry at `lastActiveAt`, then open a
     * continuation entry when the user is active again (`resumedAt`). Both
     * timestamps come from the caller's activity monitor.
     */
    static splitCommands(entry, lastActiveAt, resumedAt) {
        if (resumedAt <= lastActiveAt || lastActiveAt < entry.startedAt)
            return [];
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
