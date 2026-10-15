import {
  CAPTURE_DAILY_LIMIT_TEXT,
  CAPTURE_NOTES_MAX_BYTES,
  CAPTURE_QUEUE_FULL_TEXT,
  CAPTURE_REVOKED_TEXT,
  CAPTURE_SAVED_TEXT,
  CAPTURE_SWITCHED_OFF_TEXT,
  CAPTURE_TITLE_MAX_CHARS,
} from './capture.const';
import { enqueueCapture } from './capture-queue.store';
import { AuthenticatedGrant } from './capture-grant.store';
import { isGrantDailyCapReached, recordGrantCreate } from './capture-rate-limit';
import { isRecentCapture, recordCapture, withGrantLock } from './capture-retry-window';
import { McpToolDefinition, McpToolResult } from './mcp-protocol';

const DUE_DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';
const DUE_TIME_PATTERN = '^([01]\\d|2[0-3]):[0-5]\\d$';

/**
 * `create_task(title, notes?, dueDate?, dueTime?)`: the only tool. Public once
 * shipped: optional fields may be added, nothing removed or renamed.
 */
export const CREATE_TASK_TOOL: McpToolDefinition = {
  name: 'create_task',
  description:
    'Add a task to the Inbox in Super Productivity. Text is kept literally: ' +
    '#tags, +projects and dates in the title or notes are not parsed; pass ' +
    'dueDate (and optionally dueTime) to schedule the task. This tool cannot ' +
    'read tasks.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: `Task title, 1 to ${CAPTURE_TITLE_MAX_CHARS} characters.`,
        minLength: 1,
        maxLength: CAPTURE_TITLE_MAX_CHARS,
      },
      notes: {
        type: 'string',
        description: 'Optional notes, up to 8 KiB.',
      },
      dueDate: {
        type: 'string',
        description:
          "Optional day to schedule the task for, as YYYY-MM-DD in the user's " +
          'local calendar.',
        pattern: DUE_DATE_PATTERN,
      },
      dueTime: {
        type: 'string',
        description:
          "Optional start time on dueDate, as 24-hour HH:MM in the user's local " +
          'time zone. Requires dueDate. Without it the task is due on the day, ' +
          'with no time.',
        pattern: DUE_TIME_PATTERN,
      },
    },
    required: ['title'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
};

const text = (message: string, isError = false): McpToolResult => ({
  content: [{ type: 'text', text: message }],
  ...(isError ? { isError: true } : {}),
});

export type CreateTaskArgs = {
  title: string;
  notes?: string;
  /** `YYYY-MM-DD`, a real calendar day. */
  dueDate?: string;
  /** `HH:MM`, 24-hour; only with `dueDate`. */
  dueTime?: string;
};

const ARG_NAMES = ['title', 'notes', 'dueDate', 'dueTime'];
const DUE_DATE_RE = new RegExp(DUE_DATE_PATTERN);
const DUE_TIME_RE = new RegExp(DUE_TIME_PATTERN);

/** Rejects shapes like 2026-02-30 that the pattern lets through. */
const isCalendarDay = (day: string): boolean => {
  const [year, month, date] = day.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === date
  );
};

/** Returns the validated due fields, or the message to send back as a tool error. */
const validateDue = (
  args: Record<string, unknown>,
): Pick<CreateTaskArgs, 'dueDate' | 'dueTime'> | string => {
  const { dueDate, dueTime } = args;
  if (dueDate === undefined) {
    return dueTime === undefined ? {} : 'dueTime requires dueDate';
  }
  if (
    typeof dueDate !== 'string' ||
    !DUE_DATE_RE.test(dueDate) ||
    !isCalendarDay(dueDate)
  ) {
    return 'dueDate must be a calendar day as YYYY-MM-DD';
  }
  if (dueTime === undefined) return { dueDate };
  if (typeof dueTime !== 'string' || !DUE_TIME_RE.test(dueTime)) {
    return 'dueTime must be a 24-hour time as HH:MM';
  }
  return { dueDate, dueTime };
};

/** Returns the validated arguments, or the message to send back as a tool error. */
export const validateCreateTaskArgs = (
  args: Record<string, unknown>,
): CreateTaskArgs | string => {
  const unknown = Object.keys(args).find((key) => !ARG_NAMES.includes(key));
  if (unknown !== undefined) return `Unknown argument: ${unknown}`;
  if (typeof args.title !== 'string') return 'title must be a string';
  const title = args.title.trim();
  // Counted in code points, so emoji and CJK count as one character each.
  const titleChars = [...title].length;
  if (titleChars === 0 || titleChars > CAPTURE_TITLE_MAX_CHARS) {
    return `title must be 1 to ${CAPTURE_TITLE_MAX_CHARS} characters`;
  }
  const due = validateDue(args);
  if (typeof due === 'string') return due;
  if (args.notes === undefined) return { title, ...due };
  if (typeof args.notes !== 'string') return 'notes must be a string';
  if (Buffer.byteLength(args.notes, 'utf8') > CAPTURE_NOTES_MAX_BYTES) {
    return 'notes must be at most 8 KiB';
  }
  return args.notes.length === 0
    ? { title, ...due }
    : { title, notes: args.notes, ...due };
};

export const runCreateTask = async (
  grant: AuthenticatedGrant,
  rawArgs: Record<string, unknown>,
): Promise<McpToolResult> => {
  const args = validateCreateTaskArgs(rawArgs);
  if (typeof args === 'string') return text(args, true);

  return withGrantLock(grant.grantId, async () => {
    if (isRecentCapture(grant.grantId, args)) {
      return text(CAPTURE_SAVED_TEXT);
    }
    if (isGrantDailyCapReached(grant.grantId)) {
      return text(CAPTURE_DAILY_LIMIT_TEXT, true);
    }
    const result = await enqueueCapture(grant.userId, grant.grantId, {
      v: 1,
      title: args.title,
      ...(args.notes === undefined ? {} : { notes: args.notes }),
      // Optional v1 fields: released apps ignore them and add the task unscheduled.
      ...(args.dueDate === undefined ? {} : { dueDate: args.dueDate }),
      ...(args.dueTime === undefined ? {} : { dueTime: args.dueTime }),
      createdAt: Date.now(),
      client: grant.clientName,
    });
    if (result === 'switched_off') return text(CAPTURE_SWITCHED_OFF_TEXT, true);
    if (result === 'revoked') return text(CAPTURE_REVOKED_TEXT, true);
    if (result === 'queue_full') return text(CAPTURE_QUEUE_FULL_TEXT, true);
    recordCapture(grant.grantId, args);
    recordGrantCreate(grant.grantId);
    return text(CAPTURE_SAVED_TEXT);
  });
};
