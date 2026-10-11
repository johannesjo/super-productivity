import type {
  SuperSyncCaptureClaimResult,
  SuperSyncProvider,
} from '@sp/sync-providers/super-sync';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { INBOX_PROJECT } from '../../project/project.const';
import {
  AgentCapture,
  AgentCaptureRun,
  createSuperSyncCaptureSource,
} from './super-sync-capture-source';

/**
 * The key and item are the vector pinned in sync-core's capture-open.spec.ts
 * and the server's capture-seal.spec.ts: user key 0x01 × 32, item "item-1",
 * payload { v: 1, title: 'Buy milk', createdAt: 1, client: 'Claude' }.
 */
const KEY = {
  v: 1,
  privateKeyPkcs8:
    'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQGhRANCAARv8DuUkkHOHa3UNRnmlg4KhbQaaaBcMoEDqivOFZTKFjxPdTpVvwHcU/bAsMfu54tAxv99JaluIoK5ic73HBRK',
  publicKeySpki:
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEb/A7lJJBzh2t1DUZ5pYOCoW0GmmgXDKBA6orzhWUyhY8T3U6Vb8B3FP2wLDH7ueLQMb/fSWpbiKCuYnO9xwUSg==',
} as const;
const SEALED =
  'AQRVD0cQA/Pfl8PfUGrHl/ZyH7Gh+3uPb4PSJEmKZciOJBNgk9cBLlCac3FcvQsAo8wP9LXAGz/6GWqx+zJwNrjmAwMDAwMDAwMDAwMDVvPcrvop4zkadZl48K6FngoPEOmueJnbVQpq/L3kuXad+gVrd8UPZvLd5bkSyJANaDo07JGPJM67pw7l2yyLylKJEyur+1ke1Pc=';
const ITEM = { itemId: 'item-1', taskId: 'task-1', ciphertext: SEALED, createdAt: 5 };

describe('createSuperSyncCaptureSource', () => {
  let provider: jasmine.SpyObj<SuperSyncProvider>;
  let dispatch: jasmine.Spy;
  let isCurrent: boolean;
  let run: AgentCaptureRun | null;

  const ok = (items = [ITEM]): SuperSyncCaptureClaimResult => ({ status: 'ok', items });
  const source = (): ReturnType<typeof createSuperSyncCaptureSource> =>
    createSuperSyncCaptureSource({ startRun: () => run, dispatch });

  beforeEach(() => {
    provider = jasmine.createSpyObj<SuperSyncProvider>('SuperSyncProvider', [
      'claimCaptures',
      'registerCaptureKey',
      'ackCaptures',
    ]);
    provider.ackCaptures.and.resolveTo();
    dispatch = jasmine.createSpy('dispatch');
    isCurrent = true;
    run = {
      provider,
      key: KEY,
      deviceId: 'dev-1',
      assertUnchanged: (context) => {
        if (!isCurrent) throw new Error(`changed at ${context}`);
      },
    };
  });

  it('opens claimed items into Inbox tasks keyed by the server task id', async () => {
    provider.claimCaptures.and.resolveTo(ok());
    const src = source();

    const [capture] = await src.getPending();
    expect(capture).toEqual({
      id: 'task-1',
      task: { title: 'Buy milk', createdAt: 1 },
    });
    expect(src.isValid(capture)).toBeTrue();

    src.createTask(capture);
    const action = dispatch.calls.mostRecent().args[0] as ReturnType<
      typeof TaskSharedActions.addTask
    >;
    expect(action.type).toBe(TaskSharedActions.addTask.type);
    expect(action.task).toEqual(
      jasmine.objectContaining({
        id: 'task-1',
        title: 'Buy milk',
        projectId: INBOX_PROJECT.id,
        created: 1,
      }),
    );
    expect(action.isIgnoreShortSyntax).toBeTrue();

    await src.acknowledge('task-1');
    expect(provider.ackCaptures).toHaveBeenCalledWith('dev-1', [
      { itemId: 'item-1', taskId: 'task-1' },
    ]);
  });

  it('registers the synced key when the server has none, then claims again', async () => {
    provider.claimCaptures.and.returnValues(
      Promise.resolve({ status: 'no_key' }),
      Promise.resolve(ok()),
    );
    provider.registerCaptureKey.and.resolveTo('registered');

    expect((await source().getPending()).length).toBe(1);
    expect(provider.registerCaptureKey).toHaveBeenCalledWith(KEY.publicKeySpki);
  });

  it('imports nothing when the server reports capture switched off', async () => {
    provider.claimCaptures.and.resolveTo({ status: 'key_mismatch' });
    provider.registerCaptureKey.and.resolveTo('disabled');

    expect(await source().getPending()).toEqual([]);
    expect(provider.claimCaptures).toHaveBeenCalledTimes(1);
  });

  it('keeps an item it cannot open as invalid, never as a task', async () => {
    provider.claimCaptures.and.resolveTo(ok([{ ...ITEM, itemId: 'other-item' }]));
    const src = source();

    const [capture] = await src.getPending();
    expect(capture).toEqual({ id: 'task-1', task: null } as AgentCapture);
    expect(src.isValid(capture)).toBeFalse();
  });

  it('creates and acks nothing once the sync target changed', async () => {
    provider.claimCaptures.and.resolveTo(ok());
    const src = source();
    const [capture] = await src.getPending();
    isCurrent = false;

    expect(() => src.createTask(capture)).toThrowError(/createTask/);
    await expectAsync(src.acknowledge('task-1')).toBeRejectedWithError(/acknowledge/);
    expect(dispatch).not.toHaveBeenCalled();
    expect(provider.ackCaptures).not.toHaveBeenCalled();
  });

  it('skips the run without a request when capture is not active', async () => {
    run = null;
    expect(await source().getPending()).toEqual([]);
    expect(provider.claimCaptures).not.toHaveBeenCalled();
  });
});
