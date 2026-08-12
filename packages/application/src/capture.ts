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

const dateRe = /^(\d{4})-(\d{2})-(\d{2})$/;
const timeRe = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const toISODate = (value: unknown): ISODate | undefined =>
  typeof value === 'string' && dateRe.test(value) ? (value as ISODate) : undefined;

/** +NNm / +NNh offset relative to `now`, returning an ISO timestamp. */
const relativeTimestamp = (token: string, now: number): string | undefined => {
  const match = /^\+(\d+)(m|h)$/.exec(token);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unitMs = match[2] === 'h' ? 3_600_000 : 60_000;
  return new Date(now + amount * unitMs).toISOString();
};

const parseLocalDateTime = (
  datePart: string,
  timePart?: string,
): { day: ISODate; iso: string } | undefined => {
  const day = toISODate(datePart);
  if (!day) return undefined;
  const [hour, minute] = timePart ? timePart.split(':').map(Number) : [12, 0];
  const timestamp = Date.UTC(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
    hour,
    minute,
  );
  return { day, iso: new Date(timestamp).toISOString() };
};

const parseDateExpression = (
  value: string,
  todayStr: ISODate,
): { day?: ISODate; iso?: string } => {
  const trimmed = value.trim();
  if (trimmed === 'today') return { day: todayStr };
  if (trimmed === 'tomorrow') {
    const next = new Date(
      Date.UTC(
        Number(todayStr.slice(0, 4)),
        Number(todayStr.slice(5, 7)) - 1,
        Number(todayStr.slice(8, 10)) + 1,
      ),
    );
    return { day: next.toISOString().slice(0, 10) as ISODate };
  }
  const withTime = /^(\d{4}-\d{2}-\d{2})(?:\s+([01]?\d|2[0-3]):([0-5]\d))?$/.exec(
    trimmed,
  );
  if (withTime) {
    const { day, iso } =
      parseLocalDateTime(
        withTime[1],
        withTime[2] ? `${withTime[2]}:${withTime[3]}` : undefined,
      ) ?? {};
    return { day, iso };
  }
  return {};
};

const repeatKeywords: Record<string, () => RepeatCapture> = {
  daily: () => ({ repeatEvery: 1, repeatEveryUnit: 'DAILY', daysOfWeek: [] }),
  weekly: () => ({ repeatEvery: 1, repeatEveryUnit: 'WEEKLY', daysOfWeek: [] }),
  monthly: () => ({ repeatEvery: 1, repeatEveryUnit: 'MONTHLY', daysOfWeek: [] }),
  yearly: () => ({ repeatEvery: 1, repeatEveryUnit: 'YEARLY', daysOfWeek: [] }),
};

const weekdayIndex: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/** "every 2 weeks", "biweekly", "mon,thu", "day 15", "monthly" */
const parseRepeatExpression = (raw: string): RepeatCapture | undefined => {
  const value = raw.trim().toLowerCase();
  const direct = repeatKeywords[value];
  if (direct) return direct();

  const every = /^every\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)$/.exec(
    value,
  );
  if (every) {
    const amount = Number(every[1]);
    const unit = every[2].replace(/s$/, '');
    const map: Record<string, RecurrenceUnit> = {
      day: 'DAILY',
      week: 'WEEKLY',
      month: 'MONTHLY',
      year: 'YEARLY',
    };
    return {
      repeatEvery: Math.max(1, amount),
      repeatEveryUnit: map[unit] ?? 'DAILY',
      daysOfWeek: [],
    };
  }
  if (value === 'biweekly' || value === 'fortnightly')
    return { repeatEvery: 2, repeatEveryUnit: 'WEEKLY', daysOfWeek: [] };

  const dayList = value
    .split(/[,; ]+/)
    .filter(
      (token) => token.length >= 3 && weekdayIndex[token.slice(0, 3)] !== undefined,
    );
  if (dayList.length > 0) {
    return {
      repeatEvery: 1,
      repeatEveryUnit: 'WEEKLY',
      daysOfWeek: [
        ...new Set(dayList.map((token) => weekdayIndex[token.slice(0, 3)])),
      ].sort((a, b) => a - b),
    };
  }
  const dayOfMonth = /^day\s+(\d{1,2})$/.exec(value);
  if (dayOfMonth) {
    return {
      repeatEvery: 1,
      repeatEveryUnit: 'MONTHLY',
      daysOfWeek: [],
      dayOfMonth: Math.min(31, Number(dayOfMonth[1])),
    };
  }
  return undefined;
};

const removeKeyword = (
  text: string,
  keyword: string,
): { rest: string; value: string | undefined } => {
  const pattern = new RegExp(
    `(?:^|\\s)${keyword}:([^\\s]+(?:\\s+[^\\s]+)*?)(?=\\s+(?:p[123]|![123]|#|@|project:|due:|start:|remind:|reminder:|repeat:|rec:|>)|$)`,
    'i',
  );
  const match = pattern.exec(text);
  if (!match) return { rest: text, value: undefined };
  const value = match[1];
  const rest = text
    .slice(0, match.index)
    .concat(' ', text.slice(match.index + match[0].length))
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { rest, value };
};

export const parseCapture = (
  text: string,
  context: CaptureContext = {},
): CaptureIntent | undefined => {
  const now = context.now ?? Date.now();
  const todayStr = context.today ?? (new Date(now).toISOString().slice(0, 10) as ISODate);

  let work = text.trim();
  if (!work) return undefined;

  const intent: CaptureIntent = { title: '', tagNames: [], subtaskChain: [] };

  // Subtask nesting: split on non-empty `>` segments.
  const segments = work
    .split(/>/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length > 1) {
    const parsedIntents = segments
      .slice(0, -1)
      .map((segment) => parseCapture(segment, context));
    intent.subtaskChain = parsedIntents
      .filter((parsed): parsed is CaptureIntent => Boolean(parsed))
      .map((parsed) => parsed.title);
    work = segments[segments.length - 1];
  }

  // repeat: / rec:
  let captured = removeKeyword(work, 'repeat');
  const repeatValue = captured.value;
  if (repeatValue === undefined) {
    captured = removeKeyword(work, 'rec');
  }
  work = captured.rest;
  if (captured.value) intent.repeat = parseRepeatExpression(captured.value);

  // due:
  const due = removeKeyword(work, 'due');
  work = due.rest;
  if (due.value) {
    const parsed = parseDateExpression(due.value, todayStr);
    intent.dueDay = parsed.day;
    intent.dueAt = parsed.iso;
  }

  // start:
  const start = removeKeyword(work, 'start');
  work = start.rest;
  if (start.value) {
    const parsed = parseDateExpression(start.value, todayStr);
    intent.start = parsed.day;
    intent.startAt = parsed.iso;
  }

  // remind: / reminder:
  let remindResult = removeKeyword(work, 'remind');
  if (remindResult.value === undefined) remindResult = removeKeyword(work, 'reminder');
  work = remindResult.rest;
  if (remindResult.value) {
    const absolute = parseDateExpression(remindResult.value, todayStr);
    intent.reminderAt = absolute.iso ?? relativeTimestamp(remindResult.value, now);
  }

  // project:name
  const project = removeKeyword(work, 'project');
  work = project.rest;
  if (project.value) intent.projectName = project.value.trim();

  // @project (single word after @ until whitespace)
  const atProject = /\s@([A-Za-z0-9_-]+)/.exec(work) ?? /^@([A-Za-z0-9_-]+)/.exec(work);
  if (atProject) {
    intent.projectName = atProject[1];
    work = work
      .replace(atProject[0], ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // tags #word
  const tags = [...work.matchAll(/(?:^|\s)#([A-Za-z0-9][A-Za-z0-9_-]*)/g)];
  intent.tagNames = [...new Set(tags.map((match) => match[1]))];
  work = work
    .replace(/(?:^|\s)#([A-Za-z0-9][A-Za-z0-9_-]*)/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // priority p1|p2|p3 or !1|!2|!3
  const priority =
    /(?:^|\s)!([123])(?=\s|$)/.exec(work) ?? /(?:^|\s)p([123])(?=\s|$)/.exec(work);
  if (priority) {
    intent.priority = Number(priority[1]) as TaskPriority;
    work = work
      .replace(priority[0], ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  intent.title = work;
  if (!intent.title) return undefined;
  return intent;
};
