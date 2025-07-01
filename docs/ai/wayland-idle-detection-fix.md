# Wayland Idle Detection Fix

## Problem

The Electron `powerMonitor.getSystemIdleTime()` API doesn't work properly on Wayland-based Linux systems. This is a known upstream issue ([electron/electron#27912](https://github.com/electron/electron/issues/27912)) where:

- The function returns 0 or doesn't detect keyboard-only activity
- This affects idle time tracking in Super Productivity on modern Linux distributions that use Wayland by default (Ubuntu 22.04+, Fedora, etc.)

## Solution

This fix implements a multi-layered approach to detect idle time on Wayland systems:

### 1. Environment Detection

The system automatically detects if it's running on Wayland by checking:

- `XDG_SESSION_TYPE` environment variable
- `WAYLAND_DISPLAY` environment variable
- Desktop environment (GNOME, KDE, etc.)

### 2. Multiple Fallback Methods

When running on Wayland, the system tries these methods in order:

1. **GNOME DBus API** (for GNOME Wayland sessions):

   ```bash
   dbus-send --print-reply --dest=org.gnome.Mutter.IdleMonitor \
     /org/gnome/Mutter/IdleMonitor/Core \
     org.gnome.Mutter.IdleMonitor.GetIdletime
   ```

2. **xprintidle** (if XWayland is available):

   - Works on some Wayland systems that have XWayland support
   - Requires `xprintidle` package to be installed

3. **loginctl** (systemd-based systems):

   ```bash
   loginctl show-session -p IdleSinceHint
   ```

If all methods fail, the system returns 0 (not idle) to avoid false idle detection.

## Implementation Details

### Files Modified/Added:

1. **`electron/idle-time-handler.ts`** - New file

   - Core idle detection logic with multiple fallback methods
   - Environment detection
   - Unified API for idle time retrieval

2. **`electron/start-app.ts`** - Modified

   - Integrates the new idle handler
   - Replaces direct `powerMonitor.getSystemIdleTime()` calls
   - Uses `getIdleTimeWithFallbacks()` for robust idle detection

## Testing

To test if idle detection is working on your Wayland system:

1. **Verify D-Bus availability** (GNOME systems):

   ```bash
   dbus-send --print-reply --dest=org.gnome.Mutter.IdleMonitor \
     /org/gnome/Mutter/IdleMonitor/Core \
     org.gnome.Mutter.IdleMonitor.GetIdletime
   ```

2. **Check environment detection** in Electron logs:

   ```
   Environment detection: {
     sessionType: 'wayland',
     currentDesktop: 'ubuntu:GNOME',
     waylandDisplay: ':0',
     gnomeShellVersion: 'ubuntu',
     isWayland: true,
     isGnomeWayland: true
   }
   ```

3. **Test idle detection**:
   - Let the system idle for the configured time (default: 15 seconds)
   - The idle dialog should appear
   - Check logs for which method was used for idle detection

## Workarounds for Users

If idle detection still doesn't work:

1. **Switch to X11/Xorg session** (most reliable):

   - Log out
   - Select "Ubuntu on Xorg" or similar from the login screen
   - Log back in

2. **Install additional packages** (may help):

   ```bash
   sudo apt install xprintidle  # For xprintidle fallback
   ```

3. **Adjust idle detection settings**:
   - Go to Settings → Time Tracking
   - Increase the minimum idle time if false positives occur
   - Or disable idle detection if it's not working reliably

## Future Improvements

1. Add support for KDE's idle protocol on Wayland
2. Implement native Wayland idle detection when Electron adds support
3. Add user-configurable detection method selection
4. Support for more Wayland compositors (Sway, Hyprland, etc.)

## References

- [Electron Issue #27912](https://github.com/electron/electron/issues/27912)
- [Stretchly Issue #1261](https://github.com/hovancik/stretchly/issues/1261)
- [Wayland Idle Protocols](https://wayland.app/protocols/kde-idle)
