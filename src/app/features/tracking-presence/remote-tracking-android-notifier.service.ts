import {
  EffectRef,
  Injectable,
  Injector,
  OnDestroy,
  Signal,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Dictionary } from '@ngrx/entity';
import { TranslateService } from '@ngx-translate/core';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { androidInterface } from '../android/android-interface';
import { TrackingPresenceService } from './tracking-presence.service';
import {
  PRESENCE_HIDE_STALE_AFTER_MS,
  PRESENCE_STALE_AFTER_MS,
} from './tracking-presence.model';
import { selectCurrentTaskId, selectTaskEntities } from '../tasks/store/task.selectors';
import { T } from '../../t.const';

/** Staleness re-check cadence; the displayed times are minute-granular. */
const STALENESS_TICK_MS = 30_000;

/**
 * Drives the native Android notification mirroring another device's tracking
 * session. Pure viewer surface with the same honesty rules as the header
 * chip: silent in-place updates, no ticking timer, past tense + no Stop when
 * stale, suppressed entirely while THIS device is tracking (at most one
 * tracking notification per device — the local foreground-service one wins).
 * The native side self-destructs the notification when updates stop, so a
 * killed WebView cannot leave a frozen "Tracking…" behind.
 */
@Injectable({
  providedIn: 'root',
})
export class RemoteTrackingAndroidNotifierService implements OnDestroy {
  private _presenceService = inject(TrackingPresenceService);
  private _store = inject(Store);
  private _translateService = inject(TranslateService);
  private _injector = inject(Injector);

  // Created lazily in start(): the service is constructed on every platform
  // (via SyncWrapperService), so construction must stay free of store reads
  // and effects — they only exist while actually started on Android.
  private _localTaskId: Signal<string | null> | null = null;
  private _taskEntities: Signal<Dictionary<{ title: string }> | undefined> | null = null;
  private _now = signal(Date.now());
  private _isStarted = false;
  private _isNotificationShown = false;

  private _effectRef: EffectRef | null = null;
  private _tickTimer: ReturnType<typeof setInterval> | null = null;
  private _stopSub: Subscription | null = null;

  start(): void {
    if (!IS_ANDROID_WEB_VIEW || this._isStarted) {
      return;
    }
    this._isStarted = true;
    runInInjectionContext(this._injector, () => {
      this._localTaskId = toSignal(this._store.select(selectCurrentTaskId), {
        initialValue: null,
      });
      this._taskEntities = toSignal(this._store.select(selectTaskEntities));
      this._effectRef = effect(() => this._update());
    });
    this._tickTimer = setInterval(() => this._now.set(Date.now()), STALENESS_TICK_MS);
    this._stopSub = androidInterface.onRemoteTrackingStop$.subscribe(() =>
      this._presenceService.requestRemoteStop(),
    );
  }

  stop(): void {
    if (!this._isStarted) {
      return;
    }
    this._isStarted = false;
    this._effectRef?.destroy();
    this._effectRef = null;
    if (this._tickTimer) {
      clearInterval(this._tickTimer);
      this._tickTimer = null;
    }
    this._stopSub?.unsubscribe();
    this._stopSub = null;
    this._cancel();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private _update(): void {
    if (!this._isStarted) {
      return;
    }
    const session = this._presenceService.remoteSession();

    // Suppressed while this device tracks itself: the local foreground
    // service already owns a tracking notification, and two contradicting
    // ongoing icons ("you're tracking" + "Desktop is tracking") is clutter.
    if (!session || this._localTaskId?.()) {
      this._cancel();
      return;
    }

    const sinceReceived = this._now() - session.receivedAt;
    const isStale = !session.producerConnected || sinceReceived > PRESENCE_STALE_AFTER_MS;
    if (isStale && sinceReceived > PRESENCE_HIDE_STALE_AFTER_MS) {
      this._cancel();
      return;
    }

    const p = session.payload;
    const t = (key: string, params?: Record<string, string | number>): string =>
      this._translateService.instant(key, params);

    const title =
      (p.taskId && this._taskEntities?.()?.[p.taskId]?.title) ||
      t(T.F.TRACKING_PRESENCE.CHIP.FALLBACK_TASK);

    const stateLabel = isStale
      ? t(T.F.TRACKING_PRESENCE.CHIP.WAS_TRACKING_ON, { device: p.deviceLabel })
      : p.state === 'tracking'
        ? t(T.F.TRACKING_PRESENCE.CHIP.TRACKING_ON, { device: p.deviceLabel })
        : p.reason === 'idle'
          ? t(T.F.TRACKING_PRESENCE.CHIP.PAUSED_ON, { device: p.deviceLabel })
          : t(T.F.TRACKING_PRESENCE.CHIP.STOPPED_ON, { device: p.deviceLabel });

    const timeStr = new Date(isStale ? session.receivedAt : p.sinceTs).toLocaleTimeString(
      [],
      { hour: '2-digit', minute: '2-digit' },
    );
    const timeLabel = isStale
      ? t(T.F.TRACKING_PRESENCE.CHIP.LAST_SEEN, { time: timeStr })
      : t(T.F.TRACKING_PRESENCE.CHIP.SINCE, { time: timeStr });

    const showStop = p.state === 'tracking' && !isStale;

    androidInterface.updateRemoteTrackingNotification?.(
      title,
      `${stateLabel} · ${timeLabel}`,
      showStop,
    );
    this._isNotificationShown = true;
  }

  private _cancel(): void {
    if (this._isNotificationShown) {
      androidInterface.cancelRemoteTrackingNotification?.();
      this._isNotificationShown = false;
    }
  }
}
