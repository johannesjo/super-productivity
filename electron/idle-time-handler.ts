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

export class IdleTimeHandler {
  private isWayland: boolean = false;
  private isGnomeWayland: boolean = false;
  private workingMethod: IdleDetectionMethod = 'none';
  private hasTestedMethods: boolean = false;
  private isSnapEnvironment: boolean = false;
  private lastErrorLog: number = 0;
  private ERROR_LOG_INTERVAL = 60000; // Log errors at most once per minute

  constructor() {
    this.detectEnvironment();
  }

  private detectEnvironment(): void {
    const sessionType = process.env.XDG_SESSION_TYPE;
    const currentDesktop = process.env.XDG_CURRENT_DESKTOP;
    const waylandDisplay = process.env.WAYLAND_DISPLAY;
    const gnomeShellVersion = process.env.GNOME_SHELL_SESSION_MODE;

    this.isWayland = sessionType === 'wayland' || !!waylandDisplay;
    this.isGnomeWayland =
      this.isWayland &&
      (currentDesktop?.toLowerCase().includes('gnome') ||
        currentDesktop?.toLowerCase().includes('ubuntu') || // Ubuntu uses GNOME
        !!gnomeShellVersion);

    // Check if running in snap environment
    this.isSnapEnvironment = !!process.env.SNAP || !!process.env.SNAP_NAME;

    log.info('Environment detection:', {
      sessionType,
      currentDesktop,
      waylandDisplay,
      gnomeShellVersion,
      isWayland: this.isWayland,
      isGnomeWayland: this.isGnomeWayland,
      isSnapEnvironment: this.isSnapEnvironment,
    });
  }

  private async testIdleDetectionMethods(): Promise<void> {
    if (this.hasTestedMethods) {
      return;
    }

    log.info('Testing idle detection methods (one-time initialization)...');

    if (!this.isWayland) {
      // For X11, we can rely on powerMonitor
      this.workingMethod = 'powerMonitor';
      log.info('X11 detected, will use powerMonitor for idle detection');
    } else {
      // Test methods in order of preference for Wayland
      const methods: Array<{ name: IdleDetectionMethod; test: () => Promise<boolean> }> =
        [
          {
            name: 'gnomeDBus',
            test: async () => {
              if (!this.isGnomeWayland) return false;
              try {
                const idleTime = await this.getGnomeIdleTime();
                return idleTime !== null;
              } catch (error) {
                if (this.isSnapEnvironment) {
                  log.info('GNOME DBus test failed in snap environment:', error);
                }
                return false;
              }
            },
          },
          {
            name: 'xprintidle',
            test: async () => {
              try {
                const idleTime = await this.getXprintidleTime();
                return idleTime !== null;
              } catch {
                return false;
              }
            },
          },
          {
            name: 'loginctl',
            test: async () => {
              // Skip loginctl in snap environment due to AppArmor restrictions
              if (this.isSnapEnvironment) {
                log.info('Skipping loginctl in snap environment');
                return false;
              }
              try {
                const idleTime = await this.getLoginctlIdleTime();
                return idleTime !== null;
              } catch {
                return false;
              }
            },
          },
        ];

      for (const method of methods) {
        try {
          log.info(`Testing ${method.name}...`);
          const works = await method.test();
          if (works) {
            this.workingMethod = method.name;
            log.info(
              `Successfully tested ${method.name} - will use this for idle detection`,
            );
            break;
          } else {
            log.info(`${method.name} test failed, trying next method`);
          }
        } catch (error) {
          log.warn(`${method.name} test error:`, error);
        }
      }

      if (this.workingMethod === 'none') {
        log.warn(
          'No working idle detection method found for Wayland. Idle detection will be disabled.',
        );
      }
    }

    this.hasTestedMethods = true;
  }

  async getIdleTime(): Promise<number> {
    // Ensure methods have been tested
    if (!this.hasTestedMethods) {
      await this.testIdleDetectionMethods();
    }

    // Use the working method determined during initialization
    switch (this.workingMethod) {
      case 'powerMonitor':
        return powerMonitor.getSystemIdleTime() * 1000;

      case 'gnomeDBus':
        try {
          const idleTime = await this.getGnomeIdleTime();
          return idleTime ?? 0;
        } catch (error) {
          this.logError('GNOME DBus error', error);
          return 0;
        }

      case 'xprintidle':
        try {
          const idleTime = await this.getXprintidleTime();
          return idleTime ?? 0;
        } catch (error) {
          this.logError('xprintidle error', error);
          return 0;
        }

      case 'loginctl':
        try {
          const idleTime = await this.getLoginctlIdleTime();
          return idleTime ?? 0;
        } catch (error) {
          this.logError('loginctl error', error);
          return 0;
        }

      case 'none':
      default:
        // No working method, return 0 (not idle)
        return 0;
    }
  }

  private async getGnomeIdleTime(): Promise<number | null> {
    try {
      // Try gdbus first as it might work better in snap environments
      let command =
        'gdbus call --session --dest org.gnome.Mutter.IdleMonitor --object-path /org/gnome/Mutter/IdleMonitor/Core --method org.gnome.Mutter.IdleMonitor.GetIdletime';

      // Check if gdbus is available
      try {
        await execAsync('which gdbus', { timeout: 1000 });
      } catch {
        // Fall back to dbus-send if gdbus is not available
        command =
          'dbus-send --print-reply --dest=org.gnome.Mutter.IdleMonitor /org/gnome/Mutter/IdleMonitor/Core org.gnome.Mutter.IdleMonitor.GetIdletime';
      }

      const { stdout } = await execAsync(command, { timeout: 5000 });

      // Parse the response - gdbus format: (uint64 1234567890,)
      // dbus-send format: uint64 1234567890
      const match = stdout.match(/uint64\s+(\d+)|(?:\(uint64\s+)?(\d+)(?:,\))?/);
      if (match) {
        const idleMs = parseInt(match[1] || match[2], 10);
        // Validate the result is reasonable (not negative, not extremely large)
        if (idleMs >= 0 && idleMs < Number.MAX_SAFE_INTEGER) {
          return idleMs;
        }
      }
    } catch (error) {
      // DBus call failed, likely not running GNOME or DBus not available
      throw error;
    }

    return null;
  }

  // Alternative approach: Use loginctl for systemd-based systems
  private async getLoginctlIdleTime(): Promise<number | null> {
    try {
      const { stdout } = await execAsync('loginctl show-session -p IdleSinceHint', {
        timeout: 3000,
      });

      // Parse the output to get idle time
      const match = stdout.match(/IdleSinceHint=(\d+)/);
      if (match && match[1]) {
        const idleSince = parseInt(match[1], 10);
        // IdleSinceHint is in microseconds since epoch, 0 means active
        if (idleSince > 0) {
          const nowMs = Date.now() * 1000;
          const idleMs = nowMs - idleSince; // Convert to milliseconds
          if (idleMs >= 0 && idleMs < Number.MAX_SAFE_INTEGER) {
            return Math.floor(idleMs / 1000); // Convert back to milliseconds
          }
        }
      }
    } catch (error) {
      throw error;
    }

    return null;
  }

  // Check if we can use xprintidle as a fallback (works on some Wayland systems with XWayland)
  private async getXprintidleTime(): Promise<number | null> {
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

  // Keep the old method for compatibility but use the new approach
  async getIdleTimeWithFallbacks(): Promise<number> {
    return this.getIdleTime();
  }

  private logError(context: string, error: any): void {
    const now = Date.now();
    if (now - this.lastErrorLog > this.ERROR_LOG_INTERVAL) {
      log.debug(`${context} (falling back to 0):`, error);
      this.lastErrorLog = now;
    }
  }
}
