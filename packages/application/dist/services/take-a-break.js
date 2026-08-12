/**
 * Take-a-break: after `takeABreakMinutes` of continuous focus, prompt a break.
 * Fires once per active entry; a new entry re-arms it. Durable callers may
 * reset via `reset(entryId)` when the user actually pauses.
 */
export class TakeABreak {
    #clock;
    #state;
    #onTakeABreak;
    #promptedFor;
    constructor(options) {
        this.#clock = options.clock;
        this.#state = options.state;
        this.#onTakeABreak = options.onTakeABreak;
    }
    check(takeABreakMinutes) {
        if (takeABreakMinutes <= 0)
            return;
        const pulse = this.#state();
        if (!pulse.activeEntryId || pulse.startedAt === undefined) {
            this.#promptedFor = undefined;
            return;
        }
        if (this.#promptedFor === pulse.activeEntryId)
            return;
        const thresholdMs = takeABreakMinutes * 60_000;
        if (this.#clock.now() - pulse.startedAt >= thresholdMs) {
            this.#promptedFor = pulse.activeEntryId;
            this.#onTakeABreak(pulse.activeEntryId);
        }
    }
    reset(entryId) {
        if (this.#promptedFor === entryId)
            this.#promptedFor = undefined;
    }
}
