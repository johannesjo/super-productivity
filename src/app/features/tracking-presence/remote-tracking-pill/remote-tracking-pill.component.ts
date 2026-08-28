import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { TrackingPresenceService } from '../tracking-presence.service';
import {
  PRESENCE_HIDE_STALE_AFTER_MS,
  PRESENCE_STALE_AFTER_MS,
  RemoteTrackingSession,
} from '../tracking-presence.model';
import { selectTaskEntities } from '../../tasks/store/task.selectors';
import { fadeAnimation } from '../../../ui/animations/fade.ani';

/** Re-evaluate staleness at this cadence; display is minute-granular anyway. */
const STALENESS_TICK_MS = 30_000;

/**
 * Ambient chip naming what ANOTHER device is tracking, shown in the header's
 * pill slot when this device is not tracking itself. Deliberately quiet: no
 * ticking counter (a live-looking timer on relayed state would overstate what
 * the producer will credit — idle handling even removes time retroactively),
 * just the task, the device and a static "since". Stale state flips to past
 * tense and loses the Stop action; after 30 min it disappears entirely.
 */
@Component({
  selector: 'remote-tracking-pill',
  standalone: true,
  imports: [MatIcon, MatTooltip, TranslatePipe, DatePipe],
  animations: [fadeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visibleSession(); as session) {
      <div
        @fade
        class="remote-pill"
        [class.isStale]="isStale()"
      >
        <mat-icon class="device-icon">devices</mat-icon>
        <div class="text">
          <div class="task-title">{{ taskTitle() }}</div>
          <div class="sub">
            {{ stateLabelKey() | translate: { device: session.payload.deviceLabel } }}
            ·
            @if (isStale()) {
              {{
                T.F.TRACKING_PRESENCE.CHIP.LAST_SEEN
                  | translate: { time: (session.receivedAt | date: 'shortTime') || '' }
              }}
            } @else {
              {{
                T.F.TRACKING_PRESENCE.CHIP.SINCE
                  | translate
                    : { time: (session.payload.sinceTs | date: 'shortTime') || '' }
              }}
            }
            @if (session.payload.focus; as focus) {
              · {{ T.F.TRACKING_PRESENCE.CHIP.FOCUS | translate: { cycle: focus.cycle } }}
            }
          </div>
        </div>
        @if (canStop()) {
          <button
            type="button"
            class="stop-btn"
            (click)="stopRemote()"
            [attr.aria-label]="
              T.F.TRACKING_PRESENCE.CHIP.STOP
                | translate: { device: session.payload.deviceLabel }
            "
            matTooltip="{{
              T.F.TRACKING_PRESENCE.CHIP.STOP
                | translate: { device: session.payload.deviceLabel }
            }}"
            matTooltipPosition="below"
          >
            <mat-icon>stop</mat-icon>
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .remote-pill {
        /* Out of flow inside .pill-slot, same as tracked-task-pill: it can
           never move a header button, whatever its width. */
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        inset-inline-end: 0;
        max-width: min(100%, 520px);

        display: flex;
        align-items: center;
        gap: var(--s-half);
        white-space: nowrap;
        border: 1px dashed var(--c-accent);
        border-radius: 10px;
        padding: calc(var(--s-half) * 0.75) var(--s);
        background: var(--bg-lighter);
        font-size: 12px;

        &.isStale {
          opacity: 0.6;
          border-color: var(--extra-border-color, currentColor);
        }

        @container header-pill-slot (max-width: 220px) {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        @media (max-width: 599px) {
          display: none;
        }
      }

      .device-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      .text {
        min-width: 0;
      }

      .task-title {
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 13px;
      }

      .sub {
        opacity: 0.7;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .stop-btn {
        appearance: none;
        border: none;
        background: none;
        color: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 0;
        flex-shrink: 0;

        &:hover {
          color: var(--c-accent);
        }
      }
    `,
  ],
})
export class RemoteTrackingPillComponent {
  readonly T = T;

  private _presenceService = inject(TrackingPresenceService);
  private _store = inject(Store);
  private _translateService = inject(TranslateService);

  private _taskEntities = toSignal(this._store.select(selectTaskEntities));

  /** Ticks periodically so staleness re-evaluates without any remote event. */
  private _now = signal(Date.now());

  constructor() {
    const destroyRef = inject(DestroyRef);
    const timer = setInterval(() => this._now.set(Date.now()), STALENESS_TICK_MS);
    destroyRef.onDestroy(() => clearInterval(timer));
  }

  readonly isStale = computed(() => {
    const session = this._presenceService.remoteSession();
    if (!session) {
      return false;
    }
    return (
      !session.producerConnected ||
      this._now() - session.receivedAt > PRESENCE_STALE_AFTER_MS
    );
  });

  readonly visibleSession = computed<RemoteTrackingSession | null>(() => {
    const session = this._presenceService.remoteSession();
    if (!session) {
      return null;
    }
    // A stale session disappears entirely after a while — a remote state
    // nobody refreshes for half an hour is noise, not information.
    if (
      this.isStale() &&
      this._now() - session.receivedAt > PRESENCE_HIDE_STALE_AFTER_MS
    ) {
      return null;
    }
    return session;
  });

  readonly canStop = computed(() => {
    const session = this.visibleSession();
    // Stop against a disconnected producer would be a promise the system
    // cannot keep — the button goes away rather than silently doing nothing.
    return !!session && session.payload.state === 'tracking' && !this.isStale();
  });

  readonly stateLabelKey = computed(() => {
    const session = this.visibleSession();
    if (!session) {
      return T.F.TRACKING_PRESENCE.CHIP.TRACKING_ON;
    }
    if (this.isStale()) {
      return T.F.TRACKING_PRESENCE.CHIP.WAS_TRACKING_ON;
    }
    if (session.payload.state === 'tracking') {
      return T.F.TRACKING_PRESENCE.CHIP.TRACKING_ON;
    }
    return session.payload.reason === 'idle'
      ? T.F.TRACKING_PRESENCE.CHIP.PAUSED_ON
      : T.F.TRACKING_PRESENCE.CHIP.STOPPED_ON;
  });

  readonly taskTitle = computed(() => {
    const session = this.visibleSession();
    const taskId = session?.payload.taskId;
    if (!taskId) {
      return this._translateService.instant(T.F.TRACKING_PRESENCE.CHIP.FALLBACK_TASK);
    }
    // Ids-only payload: a task created remotely resolves only after the next
    // op sync (≤ ~5 min), so a truthful placeholder covers the gap.
    return (
      this._taskEntities()?.[taskId]?.title ??
      this._translateService.instant(T.F.TRACKING_PRESENCE.CHIP.FALLBACK_TASK)
    );
  });

  stopRemote(): void {
    this._presenceService.requestRemoteStop();
  }
}
