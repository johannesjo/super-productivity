import type { ISODate, RecurrenceUnit, TaskPriority } from '@noura/domain';
/**
 * Phrase-to-intent capture parser (Phase 3): turns a free-text line into a
 * structured task creation intent. Framework-free and deterministic against
 * the injected clock; the caller (DomainStore/model) resolves project/tag ids
 * and issues the domain commands.
 *
 * Recognized syntax:
 *   - priority:  p1|p2|p3  or  !1|!2|!3
 *   - tags:      #word
 *   - project:   @word|name  or  project:name
 *   - due:       due:today | due:tomorrow | due:YYYY-MM-DD[ HH:mm]
 *   - start:     start:YYYY-MM-DD[ HH:mm]
 *   - remind:    remind:... (same date forms or +NNm relative to now)
 *   - repeat:    repeat:daily | repeat:every 2 weeks | rec:mon,thu | repeat:monthly | repeat:yearly
 *   - subtasks:  Parent > Child > Grandchild  (nested hierarchy)
 */
export interface RepeatCapture {
    repeatEvery: number;
    repeatEveryUnit: RecurrenceUnit;
    daysOfWeek: number[];
    dayOfMonth?: number;
    weekOfMonth?: number;
    yearMonth?: number;
}
export interface CaptureIntent {
    title: string;
    priority?: TaskPriority;
    tagNames: string[];
    projectName?: string;
    dueDay?: ISODate;
    dueAt?: string;
    start?: ISODate;
    startAt?: string;
    reminderAt?: string;
    repeat?: RepeatCapture;
    /** Parent task titles for `>` nesting; empty for a root task. */
    subtaskChain: string[];
}
export interface CaptureContext {
    today?: ISODate;
    now?: number;
}
export declare const parseCapture: (text: string, context?: CaptureContext) => CaptureIntent | undefined;
