import { exec } from 'child_process';
import { promisify } from 'util';
import { powerMonitor } from 'electron';
import electronLog from 'electron-log/main';

const execAsync = promisify(exec);
const log = electronLog.scope('IdleTimeHandler');

type IdleDetectionMethod =
  | 'powerMonitor'
  | 'gnomeDBus'
  | 'xprintidle'
  | 'loginctl'
  | 'none';

interface EnvironmentInfo {
  readonly isWayland: boolean;
  readonly isGnomeWayland: boolean;
  readonly isSnap: boolean;
  readonly sessionType?: string;
  readonly currentDesktop?: string;
  readonly waylandDisplay?: string;
  readonly gnomeShellSession?: string;
}

interface IdleMethodCandidate {
  readonly name: IdleDetectionMethod;
  readonly test: () => Promise<boolean>;
}

const ERROR_LOG_INTERVAL = 60000;

export class IdleTimeHandler {
  private readonly _environment: EnvironmentInfo;
  private _methodDetectionPromise: Promise<IdleDetectionMethod> | null = null;
  private _workingMethod: IdleDetectionMethod = 'none';
  private _lastErrorLog = 0;

  constructor() {
    this._environment = this._detectEnvironment();
    this._methodDetectionPromise = this._initializeWorkingMethod();
  }

  private _detectEnvironment(): EnvironmentInfo {
    const sessionType = process.env.XDG_SESSION_TYPE;
    const currentDesktop = process.env.XDG_CURRENT_DESKTOP;
    const waylandDisplay = process.env.WAYLAND_DISPLAY;
    const gnomeShellSession = process.env.GNOME_SHELL_SESSION_MODE;

    const isWayland = sessionType === 'wayland' || !!waylandDisplay;
    const normalizedDesktop = currentDesktop?.toLowerCase() ?? '';
    const isGnomeDesktop =
      normalizedDesktop.includes('gnome') ||
      normalizedDesktop.includes('ubuntu') ||
      !!gnomeShellSession;
    const isGnomeWayland = isWayland && isGnomeDesktop;
    const isSnap = !!process.env.SNAP || !!process.env.SNAP_NAME;

    const environment: EnvironmentInfo = {
      isWayland,
      isGnomeWayland,
      isSnap,
      sessionType,
      currentDesktop,
      waylandDisplay,
      gnomeShellSession,
    };

    log.info('Environment detection:', environment);
    return environment;
  }

  private _initializeWorkingMethod(): Promise<IdleDetectionMethod> {
    const detection = this._determineWorkingMethod()
      .then((method) => {
        this._workingMethod = method;
        return method;
      })
      .catch((error) => {
        log.warn('Idle detection initialization failed', error);
        this._workingMethod = 'none';
        return 'none';
      });

    detection.then((method) => log.info(`Idle detection method ready: ${method}`));

    return detection;
  }

  private async _ensureWorkingMethod(): Promise<IdleDetectionMethod> {
    if (!this._methodDetectionPromise) {
      this._methodDetectionPromise = this._initializeWorkingMethod();
    }
    return this._methodDetectionPromise;
  }

  private async _determineWorkingMethod(): Promise<IdleDetectionMethod> {
    log.info('Determining idle detection method...');

    if (!this._environment.isWayland) {
      log.info('Using powerMonitor for non-Wayland session');
      return 'powerMonitor';
    }

    for (const candidate of this._buildWaylandCandidates()) {
      log.info(`Testing ${candidate.name}...`);
      try {
        const works = await candidate.test();
        if (works) {
          log.info(`Selected ${candidate.name} for idle detection`);
          return candidate.name;
        }
        log.info(`${candidate.name} test failed`);
      } catch (error) {
        log.warn(`${candidate.name} test error`, error);
      }
    }

    log.warn(
      'No working idle detection method found for Wayland. Idle detection will be disabled.',
    );
    return 'none';
  }

  private _buildWaylandCandidates(): IdleMethodCandidate[] {
    const candidates: IdleMethodCandidate[] = [];

    if (this._environment.isGnomeWayland) {
      candidates.push({
        name: 'gnomeDBus',
        test: async () => {
          try {
            const idleTime = await this._getGnomeIdleTime();
            return idleTime !== null;
          } catch (error) {
            if (this._environment.isSnap) {
              log.info('GNOME DBus test failed in snap environment', error);
            }
            return false;
          }
        },
      });
    }

    candidates.push({
      name: 'xprintidle',
      test: async () => {
        try {
          const idleTime = await this._getXprintidleTime();
          return idleTime !== null;
        } catch {
          return false;
        }
      },
    });

    if (this._environment.isSnap) {
      log.info('Skipping loginctl in snap environment');
    } else {
      candidates.push({
        name: 'loginctl',
        test: async () => {
          try {
            const idleTime = await this._getLoginctlIdleTime();
            return idleTime !== null;
          } catch {
            return false;
          }
        },
      });
    }

    return candidates;
  }

  async getIdleTime(): Promise<number> {
    const methodUsed = await this._ensureWorkingMethod();
    let idleTime = 0;
    let error: unknown = null;

    switch (methodUsed) {
      case 'powerMonitor':
        try {
          idleTime = powerMonitor.getSystemIdleTime() * 1000;
          log.debug(`powerMonitor idle time: ${idleTime}ms`);
        } catch (err) {
          error = err;
          log.warn('powerMonitor failed:', err);
        }
        break;

      case 'gnomeDBus':
        try {
          const result = await this._getGnomeIdleTime();
          idleTime = result ?? 0;
          log.debug(`gnomeDBus idle time: ${idleTime}ms`);
          if (result === null) {
            log.warn('gnomeDBus returned null');
          }
        } catch (err) {
          error = err;
          this._logError('GNOME DBus error', err);
          idleTime = 0;
        }
        break;

      case 'xprintidle':
        try {
          const result = await this._getXprintidleTime();
          idleTime = result ?? 0;
          log.debug(`xprintidle idle time: ${idleTime}ms`);
          if (result === null) {
            log.warn('xprintidle returned null');
          }
        } catch (err) {
          error = err;
          this._logError('xprintidle error', err);
          idleTime = 0;
        }
        break;

      case 'loginctl':
        try {
          const result = await this._getLoginctlIdleTime();
          idleTime = result ?? 0;
          log.debug(`loginctl idle time: ${idleTime}ms`);
          if (result === null) {
            log.warn('loginctl returned null');
          }
        } catch (err) {
          error = err;
          this._logError('loginctl error', err);
          idleTime = 0;
        }
        break;

      case 'none':
      default:
        log.warn('No working idle detection method available');
        idleTime = 0;
        break;
    }

    log.info(
      `Idle detection result: ${idleTime}ms (method: ${methodUsed}, hasError: ${!!error})`,
    );

    return idleTime;
  }

  private async _getGnomeIdleTime(): Promise<number | null> {
    try {
      const isSnap = this._environment.isSnap;
      if (isSnap) {
        log.debug('Attempting GNOME idle detection inside snap environment');
      }

      let command =
        'gdbus call --session --dest org.gnome.Mutter.IdleMonitor --object-path /org/gnome/Mutter/IdleMonitor/Core --method org.gnome.Mutter.IdleMonitor.GetIdletime';

      try {
        await execAsync('which gdbus', { timeout: 1000 });
      } catch {
        if (isSnap) {
          log.warn(
            'gdbus unavailable in snap environment, skipping dbus-send fallback to avoid libdbus mismatch',
          );
          return null;
        }
        command =
          'dbus-send --print-reply --dest=org.gnome.Mutter.IdleMonitor /org/gnome/Mutter/IdleMonitor/Core org.gnome.Mutter.IdleMonitor.GetIdletime';
      }

      let stdout: string;
      try {
        const result = await execAsync(command, { timeout: 5000 });
        stdout = result.stdout;
      } catch (error) {
        if (isSnap) {
          log.warn('gdbus idle monitor failed in snap environment', error);
          return null;
        }
        throw error;
      }

      const match = stdout.match(/uint64\s+(\d+)|(?:\(uint64\s+)?(\d+)(?:,\))?/);
      if (match) {
        const idleMs = parseInt(match[1] || match[2], 10);
        if (idleMs >= 0 && idleMs < Number.MAX_SAFE_INTEGER) {
          return idleMs;
        }
      }
    } catch (error) {
      throw error;
    }

    return null;
  }

  private async _getLoginctlIdleTime(): Promise<number | null> {
    try {
      const { stdout } = await execAsync('loginctl show-session -p IdleSinceHint', {
        timeout: 3000,
      });

      const match = stdout.match(/IdleSinceHint=(\d+)/);
      if (match && match[1]) {
        const idleSince = parseInt(match[1], 10);
        if (idleSince > 0) {
          const nowMs = Date.now() * 1000;
          const idleMs = nowMs - idleSince;
          if (idleMs >= 0 && idleMs < Number.MAX_SAFE_INTEGER) {
            return Math.floor(idleMs / 1000);
          }
        }
      }
    } catch (error) {
      throw error;
    }

    return null;
  }

  private async _getXprintidleTime(): Promise<number | null> {
    try {
      const { stdout } = await execAsync('xprintidle', { timeout: 3000 });
      const idleMs = parseInt(stdout.trim(), 10);
      if (!isNaN(idleMs) && idleMs >= 0) {
        return idleMs;
      }
    } catch (error) {
      throw error;
    }

    return null;
  }

  async getIdleTimeWithFallbacks(): Promise<number> {
    return this.getIdleTime();
  }

  get currentMethod(): IdleDetectionMethod {
    return this._workingMethod;
  }

  private _logError(context: string, error: unknown): void {
    const now = Date.now();
    if (now - this._lastErrorLog > ERROR_LOG_INTERVAL) {
      log.debug(`${context} (falling back to 0):`, error);
      this._lastErrorLog = now;
    }
  }
}
