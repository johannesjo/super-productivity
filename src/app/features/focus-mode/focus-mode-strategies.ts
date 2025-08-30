import { Injectable, inject } from '@angular/core';
import { FocusModeMode } from './focus-mode.const';
import { FocusModeStrategy, FocusModePhaseType } from './focus-mode.model';
import { GlobalConfigService } from '../config/global-config.service';

@Injectable({ providedIn: 'root' })
export class PomodoroStrategy implements FocusModeStrategy {
  private globalConfigService = inject(GlobalConfigService);

  get initialSessionDuration(): number {
    const config = this.globalConfigService.pomodoroConfig();
    return config?.duration || 25 * 60 * 1000;
  }

  getBreakDuration(cycle: number): { duration: number; isLong: boolean } {
    const config = this.globalConfigService.pomodoroConfig();
    const cyclesBeforeLong = config?.cyclesBeforeLongerBreak || 4;
    const isLong = cycle % cyclesBeforeLong === 0;

    const duration = isLong
      ? config?.longerBreakDuration || 15 * 60 * 1000
      : config?.breakDuration || 5 * 60 * 1000;

    return { duration, isLong };
  }

  getNextPhaseAfterTaskSelection(skipPreparation: boolean): {
    phase:
      | FocusModePhaseType.DurationSelection
      | FocusModePhaseType.Preparation
      | FocusModePhaseType.Session;
    duration?: number;
  } {
    // TODO revert
    // const config = this.globalConfigService.pomodoroConfig();
    // const duration = config?.duration || 25 * 60 * 1000;
    const duration = 4000;

    return {
      phase: skipPreparation
        ? FocusModePhaseType.Session
        : FocusModePhaseType.Preparation,
      duration,
    };
  }

  readonly shouldStartBreakAfterSession = true; // Always have breaks in Pomodoro
  readonly shouldAutoStartNextSession = true; // Auto-continue after break
}

@Injectable({ providedIn: 'root' })
export class FlowtimeStrategy implements FocusModeStrategy {
  readonly initialSessionDuration = 0; // Flowtime doesn't have a fixed duration
  readonly shouldStartBreakAfterSession = false;
  readonly shouldAutoStartNextSession = false;

  getBreakDuration(): null {
    return null; // No automatic breaks in Flowtime
  }

  getNextPhaseAfterTaskSelection(skipPreparation: boolean): {
    phase:
      | FocusModePhaseType.DurationSelection
      | FocusModePhaseType.Preparation
      | FocusModePhaseType.Session;
    duration?: number;
  } {
    return {
      phase: skipPreparation
        ? FocusModePhaseType.Session
        : FocusModePhaseType.Preparation,
      duration: 0, // Flowtime doesn't have a fixed duration
    };
  }
}

@Injectable({ providedIn: 'root' })
export class CountdownStrategy implements FocusModeStrategy {
  private globalConfigService = inject(GlobalConfigService);

  get initialSessionDuration(): number {
    const lastDuration = parseInt(
      localStorage.getItem('LAST_COUNTDOWN_DURATION') || '0',
      10,
    );
    return lastDuration || 25 * 60 * 1000;
  }

  readonly shouldStartBreakAfterSession = false;
  readonly shouldAutoStartNextSession = false;

  getBreakDuration(): null {
    return null; // No automatic breaks in Countdown mode
  }

  getNextPhaseAfterTaskSelection(skipPreparation: boolean): {
    phase:
      | FocusModePhaseType.DurationSelection
      | FocusModePhaseType.Preparation
      | FocusModePhaseType.Session;
    duration?: number;
  } {
    // Countdown mode always uses duration selection
    return {
      phase: FocusModePhaseType.DurationSelection,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class FocusModeStrategyFactory {
  private pomodoroStrategy = inject(PomodoroStrategy);
  private flowtimeStrategy = inject(FlowtimeStrategy);
  private countdownStrategy = inject(CountdownStrategy);

  getStrategy(mode: FocusModeMode): FocusModeStrategy {
    switch (mode) {
      case FocusModeMode.Pomodoro:
        return this.pomodoroStrategy;
      case FocusModeMode.Flowtime:
        return this.flowtimeStrategy;
      case FocusModeMode.Countdown:
        return this.countdownStrategy;
      default:
        return this.countdownStrategy;
    }
  }
}
