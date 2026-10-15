import { captureKeyFingerprint, CaptureOpenError, openCapture } from '@sp/sync-core';
import type {
  SuperSyncCaptureItemInfo,
  SuperSyncProvider,
} from '@sp/sync-providers/super-sync';
import { Log } from '../../../core/log';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { CaptureKeyConfig } from '../../config/global-config.model';
import { INBOX_PROJECT } from '../../project/project.const';
import { WorkContextType } from '../../work-context/work-context.model';
import { DEFAULT_TASK, Task, TaskReminderOptionId } from '../task.model';
import { remindOptionToMilliseconds } from '../util/remind-option-to-milliseconds';
import { isValidDBDateStr } from '../../../util/get-db-date-str';
import { addTaskRepeatCfgToTask } from '../../task-repeat-cfg/store/task-repeat-cfg.actions';
import { nanoid } from 'nanoid';
import {
  CaptureRepeat,
  parseCaptureRepeat,
  toCaptureRepeatCfg,
} from './capture-repeat-cfg';
import { NativeCaptureSource } from '../native-capture/native-capture-importer.service';

/** Never rename: installs keep their receipts under it. */
export const AGENT_CAPTURE_RECEIPTS_KEY = 'sp-agent-capture-receipts';

// Server limits (capture.const.ts), re-checked before a payload becomes a synced task.
const TITLE_MAX_CHARS = 500;
const NOTES_MAX_CHARS = 8 * 1024;
const DUE_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** The server has no capture routes (feature off, rollback, other server). */
export class CaptureUnsupportedError extends Error {
  override name = 'CaptureUnsupportedError';
}

export interface AgentCapture {
  /** The server-issued task id; also the importer's dedupe and receipt id. */
  id: string;
  /** Null when the item could not be opened or its payload is invalid. */
  task: {
    title: string;
    notes?: string;
    createdAt: number;
    /** `YYYY-MM-DD`; a calendar day. */
    dueDay?: string;
    /** `[hours, minutes]` on `dueDay`, in this device's time zone. */
    dueTime?: [number, number];
    repeat?: CaptureRepeat;
  } | null;
}

/** What one import run captured synchronously when it claimed. */
export interface AgentCaptureRun {
  provider: SuperSyncProvider;
  key: CaptureKeyConfig;
  deviceId: string;
  /** Set in the addTask itself, so setDefaultEstimateIfNonGiven$ adds no second op. */
  defaultEstimate: number;
  /** Applied to a capture with a time, as when scheduling in the app. */
  defaultRemindOption: TaskReminderOptionId;
  /** This device's logical today, `YYYY-MM-DD`: where an undated series starts. */
  todayStr: string;
  /** Throws SyncEpochChangedError once the account, provider or password changed. */
  assertUnchanged: (context: string) => void;
}

export interface SuperSyncCaptureSourceDeps {
  /** Called once per claim, in one synchronous block; null skips the run. */
  startRun: () => AgentCaptureRun | null;
  dispatch: (
    action:
      | ReturnType<typeof TaskSharedActions.addTask>
      | ReturnType<typeof addTaskRepeatCfgToTask>,
  ) => void;
}

/**
 * Agent captures held on the SuperSync server, as a NativeCaptureSource. The
 * capture id is the task id the server issued for this device's lease, so
 * redelivery to the same device is recognised by the importer; acknowledge
 * maps it back to the server's item id.
 */
export const createSuperSyncCaptureSource = (
  deps: SuperSyncCaptureSourceDeps,
): NativeCaptureSource<AgentCapture> => {
  let run: AgentCaptureRun | null = null;
  const itemIds = new Map<string, string>();

  const currentRun = (context: string): AgentCaptureRun => {
    if (!run) throw new Error(`Agent capture: no run at ${context}`);
    run.assertUnchanged(context);
    return run;
  };

  return {
    receiptsKey: AGENT_CAPTURE_RECEIPTS_KEY,
    getPending: async () => {
      itemIds.clear();
      run = deps.startRun();
      if (!run) return [];
      const items = await claimWithKey(run);
      items.forEach((item) => itemIds.set(item.taskId, item.itemId));
      return Promise.all(items.map((item) => openItem(run as AgentCaptureRun, item)));
    },
    isValid: (capture) => capture.task !== null,
    createTask: (capture) => {
      const active = currentRun('createTask');
      deps.dispatch(
        addInboxTaskAction(capture, active.defaultEstimate, active.defaultRemindOption),
      );
      const repeatAction = addRepeatCfgAction(capture, active);
      if (repeatAction) deps.dispatch(repeatAction);
    },
    acknowledge: async (id) => {
      const { provider, deviceId } = currentRun('acknowledge');
      const itemId = itemIds.get(id);
      if (!itemId) throw new Error('Agent capture: unknown capture id');
      await provider.ackCaptures(deviceId, [{ itemId, taskId: id }]);
    },
  };
};

/**
 * Claims one batch. A server without this account's key gets the synced one:
 * `no_key` registers it, `key_mismatch` replaces the other key (whose items
 * nobody holding the synced key could open). `disabled` means switched off.
 */
const claimWithKey = async (
  run: AgentCaptureRun,
): Promise<SuperSyncCaptureItemInfo[]> => {
  const fingerprint = await captureKeyFingerprint(run.key.publicKeySpki);
  let claim = await run.provider.claimCaptures(run.deviceId, fingerprint);
  if (claim.status === 'no_key' || claim.status === 'key_mismatch') {
    run.assertUnchanged('registerCaptureKey');
    const registered = await run.provider.registerCaptureKey(run.key.publicKeySpki);
    if (registered === 'disabled') return [];
    claim = await run.provider.claimCaptures(run.deviceId, fingerprint);
  }
  // Thrown, not an empty batch, so the importer keeps its receipts.
  if (claim.status === 'unsupported') throw new CaptureUnsupportedError();
  return claim.status === 'ok' ? (claim.items ?? []) : [];
};

const openItem = async (
  run: AgentCaptureRun,
  item: SuperSyncCaptureItemInfo,
): Promise<AgentCapture> => {
  try {
    const payload = await openCapture(run.key, item.itemId, item.ciphertext);
    return { id: item.taskId, task: toCaptureTask(payload) };
  } catch (e) {
    if (!(e instanceof CaptureOpenError)) throw e;
    // Kept un-acked: it expires server-side. Id and code only, never content.
    Log.err('Agent capture: could not open item', { id: item.itemId, reason: e.code });
    return { id: item.taskId, task: null };
  }
};

// Raw HTML tags the note sanitizer keeps and the browser loads on render.
// Table parts load their `background` attribute, which the sanitizer allows.
const AUTOLOAD_TAG =
  /<(?=\/?(?:img|picture|source|video|audio|track|image|input|table|thead|tbody|tfoot|tr|td|th)\b)/gi;

/**
 * Anyone who can steer an assistant (a web page it reads, a leaked token, the
 * server) writes these notes. A remote image would load the moment the task
 * is opened, telling the sender the user's IP and that it was read. Markdown
 * images become plain links; media tags are shown as text.
 */
export const neutralizeAutoloadMedia = (notes: string): string =>
  // `!+`: dropping one `!` of `!![` would leave a working `![`.
  notes.replace(/!+\[/g, '[').replace(AUTOLOAD_TAG, '&lt;');

// Years 0000-0099 pass the shape check but `new Date(y, …)` maps them to
// 19xx; the server never seals them, so drop them like any other bad day.
const parseDueDay = (value: unknown): string | undefined =>
  typeof value === 'string' && isValidDBDateStr(value) && !value.startsWith('00')
    ? value
    : undefined;

const parseDueTime = (value: unknown): [number, number] | undefined => {
  if (typeof value !== 'string') return undefined;
  const m = DUE_TIME_RE.exec(value);
  return m ? [Number(m[1]), Number(m[2])] : undefined;
};

/**
 * Optional v1 fields. An invalid day or time is dropped rather than failing
 * the capture: the task still lands, unscheduled, as on apps before them.
 */
const toDue = (
  p: Record<string, unknown>,
): Pick<NonNullable<AgentCapture['task']>, 'dueDay' | 'dueTime'> => {
  const dueDay = parseDueDay(p.dueDate);
  if (!dueDay) return {};
  const dueTime = parseDueTime(p.dueTime);
  return dueTime ? { dueDay, dueTime } : { dueDay };
};

/** Validates an opened payload; null when it cannot become a task. */
export const toCaptureTask = (payload: unknown): AgentCapture['task'] => {
  const p = payload as Record<string, unknown> | null;
  if (!p || p.v !== 1 || typeof p.title !== 'string') return null;
  const title = p.title.trim();
  // Code points, as the server counts them.
  const titleChars = [...title].length;
  if (titleChars === 0 || titleChars > TITLE_MAX_CHARS) return null;
  // Code points, so a cut never splits a surrogate pair.
  const notes =
    typeof p.notes === 'string'
      ? neutralizeAutoloadMedia([...p.notes].slice(0, NOTES_MAX_CHARS).join(''))
      : '';
  const createdAt = typeof p.createdAt === 'number' ? p.createdAt : Date.now();
  const repeat = parseCaptureRepeat(p.repeat);
  return {
    title,
    ...(notes ? { notes } : {}),
    createdAt,
    ...toDue(p),
    ...(repeat ? { repeat } : {}),
  };
};

/**
 * A day alone becomes `dueDay`; with a time, `dueWithTime` in this device's
 * time zone (dueDay cleared, ARCHITECTURE-DECISIONS.md Decision #1). Resolved
 * here, before the op, so replay never depends on the replaying device.
 */
const toSchedule = (
  task: NonNullable<AgentCapture['task']>,
  defaultRemindOption: TaskReminderOptionId,
): Pick<Task, 'dueDay' | 'dueWithTime' | 'hasPlannedTime' | 'remindAt'> => {
  if (!task.dueDay) return {};
  if (!task.dueTime) return { dueDay: task.dueDay };
  const [year, month, day] = task.dueDay.split('-').map(Number);
  const dueWithTime = new Date(
    year,
    month - 1,
    day,
    task.dueTime[0],
    task.dueTime[1],
  ).getTime();
  const remindAt = remindOptionToMilliseconds(dueWithTime, defaultRemindOption);
  return {
    dueDay: undefined,
    dueWithTime,
    hasPlannedTime: true,
    ...(remindAt === undefined ? {} : { remindAt }),
  };
};

const addInboxTaskAction = (
  capture: AgentCapture,
  defaultEstimate: number,
  defaultRemindOption: TaskReminderOptionId,
): ReturnType<typeof TaskSharedActions.addTask> => {
  const task = capture.task as NonNullable<AgentCapture['task']>;
  return TaskSharedActions.addTask({
    task: {
      ...DEFAULT_TASK,
      id: capture.id,
      title: task.title,
      notes: task.notes ?? '',
      projectId: INBOX_PROJECT.id,
      created: task.createdAt,
      timeEstimate: defaultEstimate,
      ...toSchedule(task, defaultRemindOption),
    },
    workContextId: INBOX_PROJECT.id,
    workContextType: WorkContextType.PROJECT,
    isAddToBacklog: false,
    isAddToBottom: true,
    isIgnoreShortSyntax: true,
  });
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Makes a recurring capture's task repeatable, as the add-task bar does after
 * its addTask: the same action, so the same effects pick the first occurrence.
 */
const addRepeatCfgAction = (
  capture: AgentCapture,
  run: AgentCaptureRun,
): ReturnType<typeof addTaskRepeatCfgToTask> | null => {
  const task = capture.task as NonNullable<AgentCapture['task']>;
  if (!task.repeat) return null;
  const startTime = task.dueTime
    ? `${pad2(task.dueTime[0])}:${pad2(task.dueTime[1])}`
    : undefined;
  const cfg = toCaptureRepeatCfg(task.repeat, {
    title: task.title,
    notes: task.notes,
    projectId: INBOX_PROJECT.id,
    startDay: task.dueDay ?? run.todayStr,
    startTime,
    defaultEstimate: run.defaultEstimate,
    remindOption: run.defaultRemindOption,
  });
  return addTaskRepeatCfgToTask({
    taskId: capture.id,
    taskRepeatCfg: { ...cfg, id: nanoid() },
    startTime: cfg.startTime,
    remindAt: cfg.remindAt,
  });
};
