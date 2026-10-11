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
import { DEFAULT_TASK } from '../task.model';
import { NativeCaptureSource } from '../native-capture/native-capture-importer.service';

/** Never rename: installs keep their receipts under it. */
export const AGENT_CAPTURE_RECEIPTS_KEY = 'sp-agent-capture-receipts';

// Server limits (capture.const.ts), re-checked before a payload becomes a synced task.
const TITLE_MAX_CHARS = 500;
const NOTES_MAX_CHARS = 8 * 1024;

/** The server has no capture routes (feature off, rollback, other server). */
export class CaptureUnsupportedError extends Error {
  override name = 'CaptureUnsupportedError';
}

export interface AgentCapture {
  /** The server-issued task id; also the importer's dedupe and receipt id. */
  id: string;
  /** Null when the item could not be opened or its payload is invalid. */
  task: { title: string; notes?: string; createdAt: number } | null;
}

/** What one import run captured synchronously when it claimed. */
export interface AgentCaptureRun {
  provider: SuperSyncProvider;
  key: CaptureKeyConfig;
  deviceId: string;
  /** Set in the addTask itself, so setDefaultEstimateIfNonGiven$ adds no second op. */
  defaultEstimate: number;
  /** Throws SyncEpochChangedError once the account, provider or password changed. */
  assertUnchanged: (context: string) => void;
}

export interface SuperSyncCaptureSourceDeps {
  /** Called once per claim, in one synchronous block; null skips the run. */
  startRun: () => AgentCaptureRun | null;
  dispatch: (action: ReturnType<typeof TaskSharedActions.addTask>) => void;
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
      const { defaultEstimate } = currentRun('createTask');
      deps.dispatch(addInboxTaskAction(capture, defaultEstimate));
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
  // Thrown, not an empty batch, so the importer keeps its receipts.
  if (claim.status === 'unsupported') throw new CaptureUnsupportedError();
  if (claim.status === 'no_key' || claim.status === 'key_mismatch') {
    run.assertUnchanged('registerCaptureKey');
    const registered = await run.provider.registerCaptureKey(run.key.publicKeySpki);
    if (registered === 'disabled') return [];
    claim = await run.provider.claimCaptures(run.deviceId, fingerprint);
  }
  return claim.status === 'ok' ? (claim.items ?? []) : [];
};

const openItem = async (
  run: AgentCaptureRun,
  item: SuperSyncCaptureItemInfo,
): Promise<AgentCapture> => {
  try {
    const payload = await openCapture(run.key, item.itemId, item.ciphertext);
    return { id: item.taskId, task: toTask(payload) };
  } catch (e) {
    if (!(e instanceof CaptureOpenError)) throw e;
    // Kept un-acked: it expires server-side. Id and code only, never content.
    Log.err('Agent capture: could not open item', { id: item.itemId, reason: e.code });
    return { id: item.taskId, task: null };
  }
};

const toTask = (payload: unknown): AgentCapture['task'] => {
  const p = payload as Record<string, unknown> | null;
  if (!p || p.v !== 1 || typeof p.title !== 'string') return null;
  const title = p.title.trim();
  // Code points, as the server counts them.
  const titleChars = [...title].length;
  if (titleChars === 0 || titleChars > TITLE_MAX_CHARS) return null;
  // Code points, so a cut never splits a surrogate pair.
  const notes =
    typeof p.notes === 'string' ? [...p.notes].slice(0, NOTES_MAX_CHARS).join('') : '';
  const createdAt = typeof p.createdAt === 'number' ? p.createdAt : Date.now();
  return { title, ...(notes ? { notes } : {}), createdAt };
};

const addInboxTaskAction = (
  capture: AgentCapture,
  defaultEstimate: number,
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
    },
    workContextId: INBOX_PROJECT.id,
    workContextType: WorkContextType.PROJECT,
    isAddToBacklog: false,
    isAddToBottom: true,
    isIgnoreShortSyntax: true,
  });
};
