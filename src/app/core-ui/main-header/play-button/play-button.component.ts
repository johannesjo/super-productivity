import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  Renderer2,
  viewChild,
} from '@angular/core';
import { MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { MsToMinuteClockStringPipe } from '../../../ui/duration/ms-to-minute-clock-string.pipe';
import { TagComponent } from '../../../features/tag/tag/tag.component';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { expandFadeHorizontalAnimation } from '../../../ui/animations/expand.ani';
import { T } from '../../../t.const';
import { Task } from '../../../features/tasks/task.model';
import { WorkContext } from '../../../features/work-context/work-context.model';
import { TaskService } from '../../../features/tasks/task.service';
import { PomodoroService } from '../../../features/pomodoro/pomodoro.service';
import { animationFrameScheduler, Subscription } from 'rxjs';
import { distinctUntilChanged, observeOn } from 'rxjs/operators';

@Component({
  selector: 'play-button',
  standalone: true,
  imports: [
    MatMiniFabButton,
    MatIcon,
    MatTooltip,
    TranslatePipe,
    MsToMinuteClockStringPipe,
    TagComponent,
  ],
  template: `
    <div class="play-btn-wrapper">
      @if (currentTask(); as task) {
        <div
          @fade
          class="current-task-title"
        >
          <div class="title">{{ task.title }}</div>
          @if (currentTaskContext(); as taskContext) {
            <tag
              @expandFadeHorizontal
              [tag]="taskContext"
              class="project"
            ></tag>
          }
        </div>
      }
      @if (currentTaskId()) {
        <div class="pulse-circle"></div>
      }

      <button
        (click)="taskService.toggleStartTask()"
        [color]="currentTaskId() ? 'accent' : 'primary'"
        matTooltip="{{ T.MH.TOGGLE_TRACK_TIME | translate }}"
        [matTooltipPosition]="pomodoroIsEnabled() ? 'left' : 'below'"
        class="play-btn tour-playBtn mat-elevation-z3"
        mat-mini-fab
      >
        @if (pomodoroIsEnabled()) {
          @if (pomodoroIsBreak()) {
            <mat-icon>free_breakfast</mat-icon>
          } @else {
            @if (!currentTaskId()) {
              <mat-icon>play_arrow</mat-icon>
            } @else {
              <mat-icon>pause</mat-icon>
            }
          }
        } @else {
          @if (!currentTaskId()) {
            <mat-icon>play_arrow</mat-icon>
          } @else {
            <mat-icon>pause</mat-icon>
          }
        }

        @if (hasTimeEstimate) {
          <svg
            class="circle-svg"
            focusable="false"
            height="40"
            width="40"
          >
            <circle
              #circleSvg
              cx="50%"
              cy="50%"
              fill="none"
              r="10"
              stroke="currentColor"
              stroke-dasharray="62.83185307179586"
              stroke-dashoffset="0"
              stroke-width="20"
            ></circle>
          </svg>
        }
      </button>

      @if (pomodoroIsEnabled()) {
        <div class="pomodoro-label">
          {{ pomodoroCurrentSessionTime() | msToMinuteClockString }}
        </div>
        <div class="pomodoro-controls">
          <button
            (click)="pomodoroService.finishPomodoroSession()"
            [matTooltip]="T.F.POMODORO.S.SESSION_SKIP | translate"
            matTooltipPosition="left"
            class="pomodoro-btn"
            color=""
            mat-mini-fab
          >
            <mat-icon>skip_next</mat-icon>
          </button>
          <button
            (click)="pomodoroService.stop()"
            [matTooltip]="T.F.POMODORO.S.RESET | translate"
            matTooltipPosition="left"
            class="pomodoro-btn"
            color=""
            mat-mini-fab
          >
            <mat-icon>restart_alt</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      @keyframes pulse {
        0% {
          transform: scale(0.7);
        }
        25% {
          transform: scale(1);
        }
        50% {
          transform: scale(1);
        }
        100% {
          transform: scale(0.7);
        }
      }

      .play-btn-wrapper {
        position: relative;
        margin: 0 6px;

        .pulse-circle {
          width: 48px;
          height: 48px;
          position: absolute;
          top: 0;
          left: -4px;
          right: 0;
          bottom: 0;
          border-radius: 50%;
          margin: auto;
          transform: scale(1, 1);
          animation: pulse 2s infinite;
          background: var(--c-accent);
          opacity: 0.6;
        }

        .play-btn {
          position: relative;
          margin-left: 0;
          z-index: 2;
          box-shadow: var(--whiteframe-shadow-2dp);

          .circle-svg {
            transform: rotate(-90deg);
            position: absolute;
            opacity: 0.15;
            top: -8px;
            right: -8px;
            pointer-events: none;
          }

          .mat-icon {
            position: relative;
            z-index: 2;
          }
        }

        .pomodoro-label {
          margin-left: 0;
          position: absolute;
          line-height: 1;
          padding: 2px 4px 1px;
          width: auto;
          left: 50%;
          transform: translateX(-50%);
          box-shadow: var(--whiteframe-shadow-2dp);
          font-weight: bold;
          border-radius: 8px;
          z-index: 4;
          pointer-events: none;
          bottom: calc(var(--s) * -0.25);
          background: var(--bg-lighter);
          color: var(--text-color-most-intense);
        }

        .pomodoro-controls {
          transition: var(--transition-standard);
          position: absolute;
          top: 100%;
          display: flex;
          flex-direction: column;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;

          &:after {
            content: '';
            position: absolute;
            top: calc(var(--s) * -1.25);
            left: calc(var(--s) * -1.25);
            right: calc(var(--s) * -1.25);
            bottom: calc(var(--s) * -1.25);
          }
        }

        &:hover .pomodoro-controls {
          pointer-events: all;

          .pomodoro-btn {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .pomodoro-btn {
          transition: var(--transition-standard);
          transform: translateY(-100%);
          opacity: 0;
          position: relative;
          z-index: 2;
          margin-top: var(--s);
          margin-left: 0;

          &:nth-child(2) {
            transform: translateY(-200%);
          }
        }
      }

      .current-task-title {
        position: absolute;
        right: 100%;
        width: auto;
        border: 2px solid var(--c-accent);
        border-radius: 12px;
        min-width: 50px;
        white-space: nowrap;
        padding: var(--s-half) var(--s2);
        padding-right: calc(var(--s) * 2.5);
        margin-right: calc(-1 * var(--s) * 2);
        top: 50%;
        transform: translateY(-50%);
        transition: var(--transition-standard);
        display: flex;
        background: var(--bg-lighter);

        @media (max-width: 599px) {
          display: none;
        }

        .title {
          max-width: 250px;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .project {
          padding-right: 0;
        }

        :host:hover & {
          opacity: 0;
        }
      }
    `,
  ],
  animations: [fadeAnimation, expandFadeHorizontalAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayButtonComponent implements OnInit, OnDestroy {
  private _renderer = inject(Renderer2);
  private _cd = inject(ChangeDetectorRef);

  readonly T = T;
  readonly taskService = inject(TaskService);
  readonly pomodoroService = inject(PomodoroService);

  readonly currentTask = input<Task | null>();
  readonly currentTaskId = input<string | null>();
  readonly currentTaskContext = input<WorkContext | null>();
  readonly pomodoroIsEnabled = input<boolean>();
  readonly pomodoroIsBreak = input<boolean>();
  readonly pomodoroCurrentSessionTime = input<number>();
  readonly circleSvg = viewChild<ElementRef<SVGCircleElement>>('circleSvg');

  private _subs = new Subscription();
  private circumference = 10 * 2 * Math.PI; // ~62.83
  protected hasTimeEstimate = false;

  ngOnInit(): void {
    // Subscribe to current task to track if it has a time estimate
    this._subs.add(
      this.taskService.currentTask$.subscribe((task) => {
        this.hasTimeEstimate = !!(task && task.timeEstimate && task.timeEstimate > 0);
        this._cd.markForCheck();
      }),
    );

    // Subscribe to task progress for circle animation
    this._subs.add(
      this.taskService.currentTaskProgress$
        .pipe(
          // Align ring updates with the frame budget and skip duplicate ratios.
          observeOn(animationFrameScheduler),
          distinctUntilChanged(),
        )
        .subscribe((progressIN) => {
          const circleSvgEl = this.circleSvg()?.nativeElement;
          if (circleSvgEl) {
            let progress = progressIN || 0;
            if (progress > 1) {
              progress = 1;
            }
            // Calculate dashoffset: 0 when 0%, negative circumference when 100%
            // This shows the completed portion of the circle
            const dashOffset = this.circumference * -progress;
            this._renderer.setStyle(circleSvgEl, 'stroke-dashoffset', dashOffset);
          }
        }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }
}
