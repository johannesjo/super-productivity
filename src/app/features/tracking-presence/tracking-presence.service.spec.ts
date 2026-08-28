import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { TrackingPresenceService } from './tracking-presence.service';
import {
  SuperSyncWebSocketService,
  PresenceWsMessage,
} from '../../op-log/sync/super-sync-websocket.service';
import { SyncProviderManager } from '../../op-log/sync-providers/provider-manager.service';
import { OperationEncryptionService } from '../../op-log/sync/operation-encryption.service';
import { SnackService } from '../../core/snack/snack.service';
import { selectCurrentTaskId } from '../tasks/store/task.selectors';
import { selectIsIdle } from '../idle/store/idle.selectors';
import {
  selectCurrentCycle,
  selectIsSessionRunning,
} from '../focus-mode/store/focus-mode.selectors';
import { setCurrentTask } from '../tasks/store/task.actions';
import {
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_HIDE_STALE_AFTER_MS,
  PRESENCE_STOPPED_LINGER_MS,
  TrackingPresenceCmd,
  TrackingPresencePayload,
} from './tracking-presence.model';

describe('TrackingPresenceService', () => {
  let service: TrackingPresenceService;
  let store: MockStore;
  let presenceMessage$: Subject<PresenceWsMessage>;
  let sendPresenceSpy: jasmine.Spy;
  let snackOpenSpy: jasmine.Spy;
  let dispatchSpy: jasmine.Spy;
  let wsConnected: WritableSignal<boolean>;
  /** What the SyncProviderManager mock resolves; null = no encryption key. */
  let resolvedProvider: unknown;

  /** Runs pending effects (the reconnect handler is an Angular effect). */
  const flushEffects = (): void => {
    TestBed.tick();
    tick();
  };

  const sentPayloads = (): {
    type: string;
    payload: TrackingPresencePayload | TrackingPresenceCmd;
  }[] =>
    sendPresenceSpy.calls.all().map((c) => ({
      type: c.args[0],
      payload: JSON.parse(JSON.parse(c.args[1]).data),
    }));

  const sentStates = (): TrackingPresencePayload[] =>
    sentPayloads()
      .filter((p) => p.type === 'presence_state')
      .map((p) => p.payload as TrackingPresencePayload);

  const setLocalTaskId = (taskId: string | null): void => {
    store.overrideSelector(selectCurrentTaskId, taskId);
    store.refreshState();
    tick();
  };

  const setIdle = (isIdle: boolean): void => {
    store.overrideSelector(selectIsIdle, isIdle);
    store.refreshState();
    tick();
  };

  const receiveRemoteState = (
    payload: Partial<TrackingPresencePayload>,
    opts: { ordinal?: number; producerConnected?: boolean } = {},
  ): void => {
    const full: TrackingPresencePayload = {
      v: 1,
      sessionId: 'remote-session',
      seq: 1,
      state: 'tracking',
      taskId: 'remote-task',
      sinceTs: Date.now(),
      deviceLabel: 'Android',
      ...payload,
    };
    presenceMessage$.next({
      kind: 'state',
      payload: JSON.stringify({ enc: false, data: JSON.stringify(full) }),
      ordinal: opts.ordinal ?? 1,
      producerConnected: opts.producerConnected !== false,
    });
    tick();
  };

  const receiveRemoteCmd = (cmd: Partial<TrackingPresenceCmd>): void => {
    const full: TrackingPresenceCmd = {
      v: 1,
      cmd: 'stop',
      sessionId: 'some-session',
      deviceLabel: 'Android',
      ...cmd,
    };
    presenceMessage$.next({
      kind: 'cmd',
      payload: JSON.stringify({ enc: false, data: JSON.stringify(full) }),
    });
    tick();
  };

  beforeEach(() => {
    presenceMessage$ = new Subject<PresenceWsMessage>();
    sendPresenceSpy = jasmine.createSpy('sendPresence');
    snackOpenSpy = jasmine.createSpy('open');
    wsConnected = signal(true);
    resolvedProvider = null;

    TestBed.configureTestingModule({
      providers: [
        TrackingPresenceService,
        provideMockStore({
          selectors: [
            { selector: selectCurrentTaskId, value: null },
            { selector: selectIsIdle, value: false },
            { selector: selectIsSessionRunning, value: false },
            { selector: selectCurrentCycle, value: 1 },
          ],
        }),
        {
          provide: SuperSyncWebSocketService,
          useValue: {
            presenceMessage$,
            sendPresence: sendPresenceSpy,
            get isConnected() {
              return wsConnected;
            },
          },
        },
        {
          provide: SyncProviderManager,
          // default: no provider -> no encryption key -> plaintext envelopes
          useValue: { getProviderById: () => Promise.resolve(resolvedProvider) },
        },
        { provide: OperationEncryptionService, useValue: {} },
        { provide: SnackService, useValue: { open: snackOpenSpy } },
      ],
    });

    service = TestBed.inject(TrackingPresenceService);
    store = TestBed.inject(MockStore);
    dispatchSpy = spyOn(store, 'dispatch').and.callThrough();
  });

  afterEach(() => {
    service.stop();
  });

  describe('producer side', () => {
    it('does not broadcast the initial stopped state on start', fakeAsync(() => {
      service.start();
      tick();
      expect(sendPresenceSpy).not.toHaveBeenCalled();
    }));

    it('broadcasts a tracking state when a task starts', fakeAsync(() => {
      service.start();
      tick();
      setLocalTaskId('task-1');

      const states = sentStates();
      expect(states.length).toBe(1);
      expect(states[0].state).toBe('tracking');
      expect(states[0].taskId).toBe('task-1');
      expect(states[0].sessionId).toBeTruthy();
      service.stop();
      flush();
    }));

    it('mints a new sessionId on task switch', fakeAsync(() => {
      service.start();
      tick();
      setLocalTaskId('task-1');
      setLocalTaskId('task-2');

      const states = sentStates();
      expect(states.length).toBe(2);
      expect(states[1].taskId).toBe('task-2');
      expect(states[1].sessionId).not.toBe(states[0].sessionId);
      service.stop();
      flush();
    }));

    it('broadcasts stopped when tracking ends locally', fakeAsync(() => {
      service.start();
      tick();
      setLocalTaskId('task-1');
      setLocalTaskId(null);

      const states = sentStates();
      expect(states.length).toBe(2);
      expect(states[1].state).toBe('stopped');
      expect(states[1].reason).toBeUndefined();
      service.stop();
      flush();
    }));

    it('broadcasts stopped with reason idle and the paused taskId on idle pause', fakeAsync(() => {
      service.start();
      tick();
      setLocalTaskId('task-1');
      // the idle flow sets isIdle and clears the current task
      setIdle(true);
      setLocalTaskId(null);

      const states = sentStates();
      const last = states[states.length - 1];
      expect(last.state).toBe('stopped');
      expect(last.reason).toBe('idle');
      expect(last.taskId).toBe('task-1');
      service.stop();
      flush();
    }));

    it('does not resurrect an old task when idle fires after a plain stop', fakeAsync(() => {
      service.start();
      tick();
      setLocalTaskId('task-1');
      setLocalTaskId(null); // plain manual stop
      const countAfterStop = sentStates().length;

      // idle fires much later, unrelated to any live session
      setIdle(true);

      expect(sentStates().length).toBe(countAfterStop);
      service.stop();
      flush();
    }));

    it('keeps heartbeating during an idle pause so viewers do not decay it to stale', fakeAsync(() => {
      service.start();
      tick();
      setLocalTaskId('task-1');
      setIdle(true);
      setLocalTaskId(null); // idle pause begins
      const countAtPause = sentStates().length;

      tick(PRESENCE_HEARTBEAT_MS + 1);

      const states = sentStates();
      expect(states.length).toBe(countAtPause + 1);
      expect(states[states.length - 1].reason).toBe('idle');
      service.stop();
      flush();
    }));

    it('resends a state transition dropped while offline once reconnected', fakeAsync(() => {
      service.start();
      flushEffects();
      setLocalTaskId('task-1');

      wsConnected.set(false);
      flushEffects();
      setLocalTaskId(null); // stop while offline -> broadcast dropped
      const countWhileOffline = sentStates().length;

      wsConnected.set(true);
      flushEffects();

      const states = sentStates();
      expect(states.length).toBe(countWhileOffline + 1);
      expect(states[states.length - 1].state).toBe('stopped');
      service.stop();
      flush();
    }));
  });

  describe('viewer side', () => {
    it('exposes a received remote tracking state as remoteSession', fakeAsync(() => {
      service.start();
      tick();
      receiveRemoteState({ taskId: 'remote-task' });

      const session = service.remoteSession();
      expect(session).toBeTruthy();
      expect(session!.payload.taskId).toBe('remote-task');
      expect(session!.producerConnected).toBeTrue();
      service.stop();
      flush();
    }));

    it('does not broadcast anything in reaction to remote states (cache clobber guard)', fakeAsync(() => {
      service.start();
      tick();
      receiveRemoteState({ state: 'tracking' });
      receiveRemoteState({ state: 'stopped', seq: 2 });
      tick(PRESENCE_STOPPED_LINGER_MS);

      expect(sendPresenceSpy).not.toHaveBeenCalled();
      service.stop();
      flush();
    }));

    it('clears a plain stopped state after the linger window', fakeAsync(() => {
      service.start();
      tick();
      receiveRemoteState({ state: 'tracking' });
      receiveRemoteState({ state: 'stopped', seq: 2, ordinal: 2 } as never, {
        ordinal: 2,
      });

      expect(service.remoteSession()!.payload.state).toBe('stopped');
      tick(PRESENCE_STOPPED_LINGER_MS + 1);
      expect(service.remoteSession()).toBeNull();
    }));

    it('keeps an idle-paused state visible without linger clearing', fakeAsync(() => {
      service.start();
      tick();
      receiveRemoteState({ state: 'stopped', reason: 'idle', taskId: 'remote-task' });

      tick(PRESENCE_STOPPED_LINGER_MS + 1);
      expect(service.remoteSession()).toBeTruthy();
      expect(service.remoteSession()!.payload.reason).toBe('idle');
      service.stop();
      flush();
    }));

    it('drops out-of-order server ordinals', fakeAsync(() => {
      service.start();
      tick();
      receiveRemoteState({ taskId: 'newer' }, { ordinal: 5 });
      receiveRemoteState({ taskId: 'older' }, { ordinal: 3 });

      expect(service.remoteSession()!.payload.taskId).toBe('newer');
      service.stop();
      flush();
    }));

    it('accepts low ordinals again after a reconnect (server chain restarts)', fakeAsync(() => {
      service.start();
      flushEffects();
      receiveRemoteState({ taskId: 'yesterday' }, { ordinal: 500 });

      wsConnected.set(false);
      flushEffects();
      wsConnected.set(true);
      flushEffects();

      receiveRemoteState({ taskId: 'today' }, { ordinal: 1 });
      expect(service.remoteSession()!.payload.taskId).toBe('today');
      service.stop();
      flush();
    }));

    it('refuses plaintext envelopes when an encryption key is configured', fakeAsync(() => {
      resolvedProvider = {
        supportsOperationSync: true,
        providerMode: 'superSyncOps',
        getEncryptKey: () => Promise.resolve('test-key'),
      };
      service.start();
      tick();
      receiveRemoteState({ taskId: 'injected' });

      expect(service.remoteSession()).toBeNull();
      service.stop();
      flush();
    }));

    it('drops states with malformed fields and strips markup from device labels', fakeAsync(() => {
      service.start();
      tick();
      receiveRemoteState({ sinceTs: 'evil' as unknown as number });
      expect(service.remoteSession()).toBeNull();

      receiveRemoteState({ deviceLabel: '<a href="https://evil">Desktop</a>' });
      expect(service.remoteSession()!.payload.deviceLabel).not.toContain('<');
      service.stop();
      flush();
    }));

    it('hides a remote session entirely after the stale-hide window', fakeAsync(() => {
      service.start();
      tick();
      receiveRemoteState({ state: 'tracking' });

      expect(service.remoteSession()).toBeTruthy();
      tick(PRESENCE_HIDE_STALE_AFTER_MS + 1);
      expect(service.remoteSession()).toBeNull();
    }));

    it('exposes a view and suppresses it while this device tracks', fakeAsync(() => {
      service.start();
      tick();
      receiveRemoteState({ taskId: 'remote-task' });
      expect(service.remoteSessionView()).toBeTruthy();

      // local tracking wins the surface — the view goes away, the cached
      // session stays
      setLocalTaskId('task-1');
      expect(service.remoteSessionView()).toBeNull();
      expect(service.remoteSession()).toBeTruthy();
      service.stop();
      flush();
    }));

    it('sends a CAS-guarded stop cmd for the shown remote session', fakeAsync(() => {
      service.start();
      tick();
      receiveRemoteState({ sessionId: 'remote-session-xyz' });

      service.requestRemoteStop();
      tick();

      const cmds = sentPayloads().filter((p) => p.type === 'presence_cmd');
      expect(cmds.length).toBe(1);
      expect((cmds[0].payload as TrackingPresenceCmd).cmd).toBe('stop');
      expect((cmds[0].payload as TrackingPresenceCmd).sessionId).toBe(
        'remote-session-xyz',
      );
      service.stop();
      flush();
    }));
  });

  describe('remote stop command (producer receiving)', () => {
    it('stops tracking and shows an attributed snack on a matching stop cmd', fakeAsync(() => {
      service.start();
      tick();
      setLocalTaskId('task-1');
      const sessionId = sentStates()[0].sessionId;
      dispatchSpy.calls.reset();

      receiveRemoteCmd({ sessionId });

      expect(dispatchSpy).toHaveBeenCalledWith(setCurrentTask({ id: null }));
      expect(snackOpenSpy).toHaveBeenCalled();
      service.stop();
      flush();
    }));

    it('ignores a stop cmd for another session and rebroadcasts its state', fakeAsync(() => {
      service.start();
      tick();
      setLocalTaskId('task-1');
      dispatchSpy.calls.reset();
      const statesBefore = sentStates().length;

      receiveRemoteCmd({ sessionId: 'outdated-session' });

      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(sentStates().length).toBe(statesBefore + 1);
      service.stop();
      flush();
    }));

    it('ignores a stop cmd when not tracking', fakeAsync(() => {
      service.start();
      tick();
      receiveRemoteCmd({ sessionId: 'whatever' });

      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(sendPresenceSpy).not.toHaveBeenCalled();
      service.stop();
      flush();
    }));
  });

  describe('takeover (both tracking)', () => {
    it('stops locally without broadcasting stopped when the remote session is newer', fakeAsync(() => {
      service.start();
      tick();
      setLocalTaskId('task-1');
      const statesBefore = sentStates().length;
      dispatchSpy.calls.reset();

      receiveRemoteState({ sinceTs: Date.now() + 10_000 }, { ordinal: 2 });

      expect(dispatchSpy).toHaveBeenCalledWith(setCurrentTask({ id: null }));
      expect(snackOpenSpy).toHaveBeenCalled();
      expect(service.remoteSession()).toBeTruthy();

      // the resulting local stopped transition must NOT broadcast — it would
      // clobber the winner's cached state on the server
      setLocalTaskId(null);
      expect(sentStates().length).toBe(statesBefore);
      service.stop();
      flush();
    }));

    it('rebroadcasts its own state and ignores the remote one when local is newer', fakeAsync(() => {
      service.start();
      tick();
      setLocalTaskId('task-1');
      const statesBefore = sentStates().length;
      dispatchSpy.calls.reset();

      receiveRemoteState({ sinceTs: Date.now() - 60_000 }, { ordinal: 2 });

      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(sentStates().length).toBe(statesBefore + 1);
      expect(service.remoteSession()).toBeNull();
      service.stop();
      flush();
    }));
  });
});
