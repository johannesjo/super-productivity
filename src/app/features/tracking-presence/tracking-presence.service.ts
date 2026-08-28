import { Injectable, Injector, OnDestroy, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { lazyInject } from '../../util/lazy-inject';
import { Subscription, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { nanoid } from 'nanoid';
import { selectCurrentTaskId } from '../tasks/store/task.selectors';
import { setCurrentTask } from '../tasks/store/task.actions';
import { selectIsIdle } from '../idle/store/idle.selectors';
import {
  selectCurrentCycle,
  selectIsSessionRunning,
} from '../focus-mode/store/focus-mode.selectors';
import {
  SuperSyncWebSocketService,
  PresenceWsMessage,
} from '../../op-log/sync/super-sync-websocket.service';
import { SyncProviderManager } from '../../op-log/sync-providers/provider-manager.service';
import { SyncProviderId } from '../../op-log/sync-providers/provider.const';
import { OperationEncryptionService } from '../../op-log/sync/operation-encryption.service';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { SyncLog } from '../../core/log';
import { getDeviceLabel } from './get-device-label.util';
import {
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_HIDE_STALE_AFTER_MS,
  PRESENCE_STALE_AFTER_MS,
  PRESENCE_STOPPED_LINGER_MS,
  RemoteSessionView,
  RemoteTrackingSession,
  TrackingPresenceCmd,
  TrackingPresenceEnvelope,
  TrackingPresencePayload,
  TrackingPresenceState,
} from './tracking-presence.model';
import { isOperationSyncCapable } from '../../op-log/sync/operation-sync.util';

/** Staleness re-check cadence for viewers; display is minute-granular. */
const VIEW_TICK_MS = 30_000;

interface LocalDerivedState {
  taskId: string | null;
  isIdle: boolean;
  isFocusRunning: boolean;
  focusCycle: number;
}

interface LocalSession {
  state: TrackingPresenceState;
  taskId: string | null;
  reason?: 'idle';
}

/**
 * Cross-device tracking presence over the SuperSync WebSocket.
 *
 * Producer side: derives this device's tracking-session state from the store
 * (current task + idle + focus) and broadcasts TRANSITIONS as ephemeral,
 * opaque (optionally E2E-encrypted) messages — never raw actions, never the
 * op-log. Viewer side: renders the last remote state as `remoteSession` and
 * can request a CAS-guarded remote stop.
 *
 * Deliberate invariants:
 * - `stopped` is only broadcast when THIS device was the one tracking —
 *   otherwise a device merely opening the app would clobber the single-slot
 *   server cache and clear every viewer.
 * - A takeover stop (another device started tracking) suppresses its own
 *   `stopped` broadcast for the same reason; a remote-commanded stop does NOT
 *   (that broadcast is the ack that clears the commanding viewer).
 * - All dispatched actions (`setCurrentTask`) are non-persistent, so nothing
 *   here can create sync ops or replay hazards.
 */
@Injectable({
  providedIn: 'root',
})
export class TrackingPresenceService implements OnDestroy {
  private _store = inject(Store);
  private _injector = inject(Injector);
  // Lazily resolved: this service is constructed on every platform (via
  // SyncWrapperService and the header), and these collaborators do real work
  // in their constructors — they must only materialize once presence is used.
  private _getWs = lazyInject(this._injector, SuperSyncWebSocketService);
  private _getProviderManager = lazyInject(this._injector, SyncProviderManager);
  private _getEncryption = lazyInject(this._injector, OperationEncryptionService);
  private _getSnackService = lazyInject(this._injector, SnackService);

  /** Last known remote tracking session, or null when there is none to show. */
  readonly remoteSession = signal<RemoteTrackingSession | null>(null);

  /** Mirrors selectCurrentTaskId; feeds view suppression while WE track. */
  private _localTaskIdView = signal<string | null>(null);
  /** Ticks (only while a session is shown) so staleness re-evaluates. */
  private _viewNow = signal(Date.now());

  /**
   * The single view-model every viewer surface (header pill, Android
   * notification) renders from — null while THIS device tracks (the local
   * surface wins) or when there is nothing to show. Centralized so the
   * staleness rules ("past tense + no Stop when stale") cannot diverge
   * between surfaces.
   */
  readonly remoteSessionView = computed<RemoteSessionView | null>(() => {
    const session = this.remoteSession();
    if (!session || this._localTaskIdView()) {
      return null;
    }
    const isStale =
      !session.producerConnected ||
      this._viewNow() - session.receivedAt > PRESENCE_STALE_AFTER_MS;
    const p = session.payload;
    const stateKey = isStale
      ? T.F.TRACKING_PRESENCE.CHIP.WAS_TRACKING_ON
      : p.state === 'tracking'
        ? T.F.TRACKING_PRESENCE.CHIP.TRACKING_ON
        : p.reason === 'idle'
          ? T.F.TRACKING_PRESENCE.CHIP.PAUSED_ON
          : T.F.TRACKING_PRESENCE.CHIP.STOPPED_ON;
    return {
      session,
      isStale,
      stateKey,
      timeKey: isStale
        ? T.F.TRACKING_PRESENCE.CHIP.LAST_SEEN
        : T.F.TRACKING_PRESENCE.CHIP.SINCE,
      timeTs: isStale ? session.receivedAt : p.sinceTs,
      // Stop against a disconnected producer would be a promise the system
      // cannot keep — the button goes away rather than silently doing nothing.
      showStop: p.state === 'tracking' && !isStale,
    };
  });

  private _subs: Subscription | null = null;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _lingerTimer: ReturnType<typeof setTimeout> | null = null;
  private _hideTimer: ReturnType<typeof setTimeout> | null = null;
  private _viewTicker: ReturnType<typeof setInterval> | null = null;

  // Producer-session state
  private _current: LocalSession = { state: 'stopped', taskId: null };
  private _sessionId: string = '';
  private _seq = 0;
  private _sinceTs = 0;
  private _lastTrackedTaskId: string | null = null;
  private _focusCycle: number | undefined;
  private _suppressNextStopBroadcast = false;

  // Viewer ordering state
  private _lastOrdinal = 0;

  start(): void {
    if (this._subs) {
      return;
    }
    this._subs = new Subscription();

    this._subs.add(
      combineLatest([
        this._store.select(selectCurrentTaskId),
        this._store.select(selectIsIdle),
        this._store.select(selectIsSessionRunning),
        this._store.select(selectCurrentCycle),
      ])
        .pipe(
          map(
            ([taskId, isIdle, isFocusRunning, focusCycle]): LocalDerivedState => ({
              taskId,
              isIdle,
              isFocusRunning,
              focusCycle,
            }),
          ),
          distinctUntilChanged(
            (a, b) =>
              a.taskId === b.taskId &&
              a.isIdle === b.isIdle &&
              a.isFocusRunning === b.isFocusRunning &&
              a.focusCycle === b.focusCycle,
          ),
        )
        .subscribe((derived) => this._onLocalChange(derived)),
    );

    this._subs.add(
      this._getWs().presenceMessage$.subscribe((msg) => {
        this._onPresenceMessage(msg).catch((err) =>
          SyncLog.warn('TrackingPresenceService: Failed to handle presence message', err),
        );
      }),
    );
  }

  stop(): void {
    this._subs?.unsubscribe();
    this._subs = null;
    this._stopHeartbeat();
    this._setRemoteSession(null);
    this._lastOrdinal = 0;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  /**
   * Requests a stop of the session currently shown as `remoteSession`.
   * CAS-guarded: the command names the session, and the producer ignores it
   * (rebroadcasting its actual state) if it has moved on. The viewer's UI is
   * cleared by the producer's `stopped` ack broadcast, not optimistically.
   */
  requestRemoteStop(): void {
    const rs = this.remoteSession();
    if (!rs || rs.payload.state !== 'tracking') {
      return;
    }
    const cmd: TrackingPresenceCmd = {
      v: 1,
      cmd: 'stop',
      sessionId: rs.payload.sessionId,
      deviceLabel: getDeviceLabel(),
    };
    this._send('presence_cmd', cmd).catch((err) =>
      SyncLog.warn('TrackingPresenceService: Failed to send stop cmd', err),
    );
  }

  // ----------------------------------------------------------------------
  // Producer side
  // ----------------------------------------------------------------------

  private _onLocalChange(derived: LocalDerivedState): void {
    this._focusCycle = derived.isFocusRunning ? derived.focusCycle : undefined;
    this._localTaskIdView.set(derived.taskId);

    if (derived.taskId) {
      const isNewSession =
        this._current.state !== 'tracking' || this._current.taskId !== derived.taskId;
      if (isNewSession) {
        this._sessionId = nanoid();
        this._sinceTs = Date.now();
      }
      this._lastTrackedTaskId = derived.taskId;
      this._current = { state: 'tracking', taskId: derived.taskId };
      this._startHeartbeat();
      this._broadcastState();
      return;
    }

    const wasTracking = this._current.state === 'tracking';
    const reason =
      derived.isIdle && this._lastTrackedTaskId !== null ? ('idle' as const) : undefined;
    const next: LocalSession = {
      state: 'stopped',
      taskId: reason ? this._lastTrackedTaskId : null,
      reason,
    };
    const reasonChanged = this._current.reason !== next.reason;
    this._current = next;
    this._stopHeartbeat();

    // Broadcasting `stopped` is only this device's business if it was the one
    // tracking (or its idle pause is ending/starting) — see class invariants.
    if (!wasTracking && !reasonChanged) {
      return;
    }
    if (this._suppressNextStopBroadcast) {
      this._suppressNextStopBroadcast = false;
      return;
    }
    this._broadcastState();
  }

  private _broadcastState(): void {
    if (!this._sessionId) {
      // Never tracked on this device in this app run — nothing to announce.
      return;
    }
    const payload: TrackingPresencePayload = {
      v: 1,
      sessionId: this._sessionId,
      seq: ++this._seq,
      state: this._current.state,
      ...(this._current.reason ? { reason: this._current.reason } : {}),
      taskId: this._current.taskId,
      sinceTs: this._sinceTs,
      deviceLabel: getDeviceLabel(),
      ...(this._focusCycle !== undefined ? { focusCycle: this._focusCycle } : {}),
    };
    this._send('presence_state', payload).catch((err) =>
      SyncLog.warn('TrackingPresenceService: Failed to broadcast state', err),
    );
  }

  private _startHeartbeat(): void {
    if (this._heartbeatTimer) {
      return;
    }
    this._heartbeatTimer = setInterval(() => {
      if (this._current.state === 'tracking') {
        this._broadcastState();
      }
    }, PRESENCE_HEARTBEAT_MS);
  }

  private _stopHeartbeat(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  // ----------------------------------------------------------------------
  // Viewer side
  // ----------------------------------------------------------------------

  private async _onPresenceMessage(msg: PresenceWsMessage): Promise<void> {
    const parsed = await this._decode(msg.payload);
    if (!parsed) {
      return;
    }
    if (msg.kind === 'cmd') {
      this._onRemoteCmd(parsed as TrackingPresenceCmd);
      return;
    }
    this._onRemoteState(parsed as TrackingPresencePayload, msg);
  }

  private _onRemoteState(
    p: TrackingPresencePayload,
    msg: Extract<PresenceWsMessage, { kind: 'state' }>,
  ): void {
    if (
      p.v !== 1 ||
      typeof p.sessionId !== 'string' ||
      (p.state !== 'tracking' && p.state !== 'stopped')
    ) {
      return;
    }
    // Server-assigned ordinal orders states across producers without trusting
    // device clocks. Equal ordinals are re-announcements of the same state
    // (producerConnected flag flips) and must pass.
    if (msg.ordinal < this._lastOrdinal) {
      return;
    }
    this._lastOrdinal = msg.ordinal;
    const existing = this.remoteSession();
    if (
      existing &&
      existing.payload.sessionId === p.sessionId &&
      p.seq < existing.payload.seq
    ) {
      return;
    }

    if (p.state === 'tracking' && this._current.state === 'tracking') {
      this._resolveTakeover(p);
      return;
    }

    this._setRemoteSession({
      payload: p,
      producerConnected: msg.producerConnected,
      receivedAt: Date.now(),
    });

    // Plain `stopped` lingers briefly so a task switch (stop+start within
    // seconds) mutates the surface in place instead of flapping it away.
    // An idle pause (`reason: 'idle'`) stays visible as "Paused".
    if (p.state === 'stopped' && !p.reason) {
      this._lingerTimer = setTimeout(() => {
        this._lingerTimer = null;
        this._setRemoteSession(null);
      }, PRESENCE_STOPPED_LINGER_MS);
    }
  }

  /**
   * Both this device and a remote one claim to be tracking. Exactly one may
   * win (one active session account-wide). The later-started session wins;
   * sessionId compare breaks exact ties deterministically on both ends.
   * Losing is loud and reversible: an attributed snack with a one-tap
   * take-back — silent stops read as data-loss bugs.
   */
  private _resolveTakeover(p: TrackingPresencePayload): void {
    const remoteWins =
      p.sinceTs > this._sinceTs ||
      (p.sinceTs === this._sinceTs && p.sessionId > this._sessionId);
    if (!remoteWins) {
      // We are newer — re-announce so the other device take-over-stops itself
      // and the server cache is corrected.
      this._broadcastState();
      return;
    }
    const prevTaskId = this._current.taskId;
    this._suppressNextStopBroadcast = true;
    this._store.dispatch(setCurrentTask({ id: null }));
    this._getSnackService().open({
      msg: T.F.TRACKING_PRESENCE.S.MOVED_TO,
      translateParams: { device: p.deviceLabel },
      actionStr: T.F.TRACKING_PRESENCE.S.TRACK_HERE_AGAIN,
      actionFn: () => {
        if (prevTaskId) {
          this._store.dispatch(setCurrentTask({ id: prevTaskId }));
        }
      },
    });
    this._setRemoteSession({
      payload: p,
      producerConnected: true,
      receivedAt: Date.now(),
    });
  }

  private _onRemoteCmd(cmd: TrackingPresenceCmd): void {
    if (cmd.v !== 1 || cmd.cmd !== 'stop' || typeof cmd.sessionId !== 'string') {
      return;
    }
    if (this._current.state !== 'tracking') {
      return;
    }
    if (cmd.sessionId !== this._sessionId) {
      // CAS mismatch: the viewer acted on an outdated session (we switched
      // tasks since). Never stop — correct the viewer instead.
      this._broadcastState();
      return;
    }
    this._store.dispatch(setCurrentTask({ id: null }));
    this._getSnackService().open({
      msg: T.F.TRACKING_PRESENCE.S.STOPPED_FROM,
      translateParams: { device: cmd.deviceLabel },
    });
  }

  /**
   * Single write path for `remoteSession`: resets the linger/hide timers and
   * runs the staleness ticker only while something is actually shown. The
   * hide timer guarantees a session nobody refreshes disappears — and with
   * it every downstream timer/effect — instead of lingering forever.
   */
  private _setRemoteSession(rs: RemoteTrackingSession | null): void {
    if (this._lingerTimer) {
      clearTimeout(this._lingerTimer);
      this._lingerTimer = null;
    }
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    this.remoteSession.set(rs);
    if (rs) {
      this._hideTimer = setTimeout(() => {
        this._hideTimer = null;
        this._setRemoteSession(null);
      }, PRESENCE_HIDE_STALE_AFTER_MS);
      if (!this._viewTicker) {
        this._viewTicker = setInterval(() => this._viewNow.set(Date.now()), VIEW_TICK_MS);
      }
    } else if (this._viewTicker) {
      clearInterval(this._viewTicker);
      this._viewTicker = null;
    }
  }

  // ----------------------------------------------------------------------
  // Wire encoding — opaque envelope, E2E-encrypted when a key is configured
  // ----------------------------------------------------------------------

  private async _send(
    type: 'presence_state' | 'presence_cmd',
    obj: TrackingPresencePayload | TrackingPresenceCmd,
  ): Promise<void> {
    if (!this._getWs().isConnected()) {
      // Fire-and-forget: skip the encode/encrypt work entirely while the
      // socket is down; the next transition/heartbeat re-announces anyway.
      return;
    }
    const key = await this._getEncryptKey();
    const envelope: TrackingPresenceEnvelope = key
      ? { enc: true, data: await this._getEncryption().encryptPayload(obj, key) }
      : { enc: false, data: JSON.stringify(obj) };
    this._getWs().sendPresence(type, JSON.stringify(envelope));
  }

  private async _decode(payloadStr: string): Promise<unknown | null> {
    let envelope: TrackingPresenceEnvelope;
    try {
      envelope = JSON.parse(payloadStr);
    } catch {
      return null;
    }
    if (typeof envelope?.data !== 'string') {
      return null;
    }
    try {
      if (envelope.enc) {
        const key = await this._getEncryptKey();
        if (!key) {
          SyncLog.warn(
            'TrackingPresenceService: Encrypted presence received but no key configured',
          );
          return null;
        }
        return await this._getEncryption().decryptPayload(envelope.data, key);
      }
      return JSON.parse(envelope.data);
    } catch (err) {
      SyncLog.warn('TrackingPresenceService: Failed to decode presence payload', err);
      return null;
    }
  }

  private async _getEncryptKey(): Promise<string | undefined> {
    try {
      const provider = await this._getProviderManager().getProviderById(
        SyncProviderId.SuperSync,
      );
      return provider && isOperationSyncCapable(provider) && provider.getEncryptKey
        ? await provider.getEncryptKey()
        : undefined;
    } catch (err) {
      SyncLog.warn('TrackingPresenceService: Failed to resolve encrypt key', err);
      return undefined;
    }
  }
}
