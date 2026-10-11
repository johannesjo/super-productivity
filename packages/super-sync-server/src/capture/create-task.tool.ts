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

/**
 * `create_task(title, notes?)`: the only tool. Public once shipped: optional
 * fields may be added, nothing removed or renamed.
 */
export const CREATE_TASK_TOOL: McpToolDefinition = {
  name: 'create_task',
  description:
    'Add a task to the Inbox in Super Productivity. Text is kept literally: ' +
    '#tags, +projects and dates are not parsed. This tool cannot read tasks.',
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

export type CreateTaskArgs = { title: string; notes?: string };

/** Returns the validated arguments, or the message to send back as a tool error. */
export const validateCreateTaskArgs = (
  args: Record<string, unknown>,
): CreateTaskArgs | string => {
  const unknown = Object.keys(args).find((key) => key !== 'title' && key !== 'notes');
  if (unknown !== undefined) return `Unknown argument: ${unknown}`;
  if (typeof args.title !== 'string') return 'title must be a string';
  const title = args.title.trim();
  // Counted in code points, so emoji and CJK count as one character each.
  const titleChars = [...title].length;
  if (titleChars === 0 || titleChars > CAPTURE_TITLE_MAX_CHARS) {
    return `title must be 1 to ${CAPTURE_TITLE_MAX_CHARS} characters`;
  }
  if (args.notes === undefined) return { title };
  if (typeof args.notes !== 'string') return 'notes must be a string';
  if (Buffer.byteLength(args.notes, 'utf8') > CAPTURE_NOTES_MAX_BYTES) {
    return 'notes must be at most 8 KiB';
  }
  return args.notes.length === 0 ? { title } : { title, notes: args.notes };
};

export const runCreateTask = async (
  grant: AuthenticatedGrant,
  rawArgs: Record<string, unknown>,
): Promise<McpToolResult> => {
  const args = validateCreateTaskArgs(rawArgs);
  if (typeof args === 'string') return text(args, true);

  return withGrantLock(grant.grantId, async () => {
    if (isRecentCapture(grant.grantId, args.title, args.notes)) {
      return text(CAPTURE_SAVED_TEXT);
    }
    if (isGrantDailyCapReached(grant.grantId)) {
      return text(CAPTURE_DAILY_LIMIT_TEXT, true);
    }
    const result = await enqueueCapture(grant.userId, grant.grantId, {
      v: 1,
      title: args.title,
      ...(args.notes === undefined ? {} : { notes: args.notes }),
      createdAt: Date.now(),
      client: grant.clientName,
    });
    if (result === 'switched_off') return text(CAPTURE_SWITCHED_OFF_TEXT, true);
    if (result === 'revoked') return text(CAPTURE_REVOKED_TEXT, true);
    if (result === 'queue_full') return text(CAPTURE_QUEUE_FULL_TEXT, true);
    recordCapture(grant.grantId, args.title, args.notes);
    recordGrantCreate(grant.grantId);
    return text(CAPTURE_SAVED_TEXT);
  });
};
