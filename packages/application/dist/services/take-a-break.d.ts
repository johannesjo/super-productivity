import type { ClockPort, FocusPulse } from './ports';
export type { FocusPulse };
export interface TakeABreakOptions {
    clock: ClockPort;
    /** Active focus state. */
    state: () => FocusPulse;
    /** Called when a take-a-break prompt is due for the active entry. */
    onTakeABreak: (entryId: string) => void;
}
/**
 * Take-a-break: after `takeABreakMinutes` of continuous focus, prompt a break.
 * Fires once per active entry; a new entry re-arms it. Durable callers may
 * reset via `reset(entryId)` when the user actually pauses.
 */
export declare class TakeABreak {
    #private;
    constructor(options: TakeABreakOptions);
    check(takeABreakMinutes: number): void;
    reset(entryId: string): void;
}
