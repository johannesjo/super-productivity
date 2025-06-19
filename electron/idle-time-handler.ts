import { exec } from 'child_process';
import { promisify } from 'util';
import { powerMonitor } from 'electron';
import electronLog from 'electron-log/main';

const execAsync = promisify(exec);
const log = electronLog.scope('IdleTimeHandler');

export class IdleTimeHandler {
  private isWayland: boolean = false;
  private isGnomeWayland: boolean = false;

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

    log.info('Environment detection:', {
      sessionType,
      currentDesktop,
      waylandDisplay,
      gnomeShellVersion,
      isWayland: this.isWayland,
      isGnomeWayland: this.isGnomeWayland,
    });
  }

  async getIdleTime(): Promise<number> {
    if (!this.isWayland) {
      // Use standard Electron API for X11/non-Wayland sessions
      return powerMonitor.getSystemIdleTime() * 1000;
    }

    if (this.isGnomeWayland) {
      // Try to get idle time from GNOME Mutter via DBus
      try {
        const idleTime = await this.getGnomeIdleTime();
        if (idleTime !== null) {
          return idleTime;
        }
      } catch (error) {
        log.warn('Failed to get GNOME idle time:', error);
      }
    }

    // If Wayland but no GNOME or GNOME failed, return 0
    // This is safer than returning incorrect idle time
    return 0;
  }

  private async getGnomeIdleTime(): Promise<number | null> {
    try {
      const { stdout } = await execAsync(
        'dbus-send --print-reply --dest=org.gnome.Mutter.IdleMonitor /org/gnome/Mutter/IdleMonitor/Core org.gnome.Mutter.IdleMonitor.GetIdletime',
        { timeout: 5000 }, // 5 second timeout
      );

      // Parse the DBus response to extract the idle time
      // Expected format: "uint64 1234567890"
      const match = stdout.match(/uint64\s+(\d+)/);
      if (match && match[1]) {
        const idleMs = parseInt(match[1], 10);
        // Validate the result is reasonable (not negative, not extremely large)
        if (idleMs >= 0 && idleMs < Number.MAX_SAFE_INTEGER) {
          return idleMs;
        }
      }
    } catch (error) {
      // DBus call failed, likely not running GNOME or DBus not available
      log.debug('GNOME DBus idle time query failed:', error);
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
      log.debug('loginctl idle time query failed:', error);
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
      log.debug('xprintidle not available:', error);
    }

    return null;
  }

  async getIdleTimeWithFallbacks(): Promise<number> {
    if (!this.isWayland) {
      // Use standard Electron API for X11/non-Wayland sessions
      const idleTime = powerMonitor.getSystemIdleTime() * 1000;
      log.debug(`X11/non-Wayland: Using powerMonitor, idle time: ${idleTime}ms`);
      return idleTime;
    }

    // Try multiple methods in order of preference
    const methods = [
      { name: 'GNOME DBus', fn: () => this.getGnomeIdleTime() },
      { name: 'xprintidle', fn: () => this.getXprintidleTime() },
      { name: 'loginctl', fn: () => this.getLoginctlIdleTime() },
    ];

    for (const method of methods) {
      try {
        const idleTime = await method.fn();
        if (idleTime !== null && idleTime >= 0) {
          log.debug(`Wayland: Using ${method.name}, idle time: ${idleTime}ms`);
          return idleTime;
        }
      } catch (error) {
        log.debug(`Wayland: ${method.name} failed, trying next method`);
      }
    }

    // If all methods fail on Wayland, return 0 (not idle)
    // This is safer than returning incorrect idle time
    log.warn('Wayland: All idle detection methods failed, returning 0');
    return 0;
  }
}
