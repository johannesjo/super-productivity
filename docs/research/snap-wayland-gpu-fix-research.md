# Snap + Wayland GPU init failure — root cause and shipped fix

> **Status:** Fixed and shipped. This note is the surviving rationale for guards
> that live in `tools/afterPack.js`, `build/linux/snap-wrapper.sh` and
> `electron/start-app.ts`; those three cite it, so it is maintained rather than
> deleted.
>
> **Snapshot:** 2026-04-21. The 2026-04 investigation log (18 sections of
> review passes, options analysis, field-data triage and multi-agent
> verification) was removed once its conclusions landed in code — recover it with
> `git show 07511ab45c:docs/research/snap-wayland-gpu-fix-research.md`.
>
> **Issues:** #5672, #7270, PR #7273. **Removal condition:** see
> [Removal conditions](#removal-conditions).

## Root cause

A subset of Snap users hit a GPU initialization failure at launch: a tray icon
with no window, a segfault, or a flood of GL errors.

The cause is **Mesa ABI drift**, not missing files. `libgl1-mesa-dri` is present
in the `gnome-42-2204` content snap, but the Mesa it ships (via the
`core22-mesa-backports` PPA) does not reliably match the Mesa/libgbm ABI that
recent Electron Chromium builds expect. The canonical signature is
`"DRI driver not from this Mesa build"`.

What changed in late 2025 was exposure, not the bug: **Chromium 140 (Aug 2025)
flipped `--ozone-platform-hint` to `auto`**, inherited by Electron ≥ 38. Electron
now runs as a native Wayland client in any Wayland session
(`XDG_SESSION_TYPE=wayland`), so users who had been silently running X11 — and
therefore silently avoiding the mismatch — were moved onto the failing path.

## The shipped fix: argv injection via an afterPack wrapper

`tools/afterPack.js` renames the main Electron binary to
`superproductivity-bin` at build time and installs `build/linux/snap-wrapper.sh`
under the original name. The wrapper decides at launch whether to inject
`--ozone-platform=x11` into argv:

```sh
if [ -n "$IS_OUR_SNAP" ] && [ -z "$HAS_OZONE_PLATFORM" ] && { [ "$XDG_SESSION_TYPE" = "wayland" ] || [ -n "$WAYLAND_DISPLAY" ]; }; then
  exec "$BIN" --ozone-platform=x11 "$@"
fi
exec "$BIN" "$@"
```

Four properties matter:

1. **Argv-level.** The flag is in `process.argv[1]` before Electron or Chromium
   starts — no ambiguity about when Ozone reads the command line.
2. **Gated on _our_ Snap plus Wayland.** The gate requires
   `$SNAP_NAME = "superproductivity"`, not merely `$SNAP` being set, so a
   `.deb`/`.rpm` install launched via `xdg-open` from a sibling snap (where
   `$SNAP` leaks into the child env) is untouched. X11 sessions and non-Snap
   Linux targets pass through unchanged.
3. **User override wins.** If argv already carries `--ozone-platform=...` the
   wrapper passes through. The scan stops at `--`.
4. **Survives `app.relaunch()`.** `IPC.RELAUNCH` points `execPath` at the sibling
   wrapper; otherwise Electron would relaunch the renamed ELF directly and lose
   the injection. See `electron/ipc-handlers/app-control.ts`.

Peer precedent: `snapcrafters/signal-desktop` and
`snapcrafters/mattermost-desktop` use the same shape as a command-chain script.
Ours lives in `afterPack` because electron-builder regenerates `snapcraft.yaml`
on every build.

### Why not `linux.executableArgs`

electron-builder ignores `snap.executableArgs`
([electron-builder#4587](https://github.com/electron-userland/electron-builder/issues/4587)),
and even if it worked it would bake the flag in for X11 sessions too. The
wrapper is runtime-conditional.

### §18.7 Mechanism — why `appendSwitch` cannot work here

The CLI-flag-vs-`appendSwitch` divergence is **strict initialization order**, not
timing or env interaction. Verified against Electron and Chromium source:

1. Electron's C++ `ElectronBrowserMainParts::PreEarlyInitialization()` calls
   `SetOzonePlatformForLinuxIfNeeded(*base::CommandLine::ForCurrentProcess())`,
   then `ui::OzonePlatform::PreEarlyInitialization()`
   ([electron#48301](https://github.com/electron/electron/pull/48301/files)).
2. That reads `--ozone-platform` from the current command line, resolves the
   platform, and memoizes it in the static `g_selected_platform`
   ([ui/ozone/platform_selection.cc](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/ui/ozone/platform_selection.cc)).
3. V8 loads `main.js` later, during `PostEarlyInitialization()`.
4. `app.commandLine.appendSwitch('ozone-platform', 'x11')` then writes a value
   **nobody reads again**.

So no Electron main-process JS can affect Ozone platform selection. Injecting
argv from outside the binary is structurally the only fix.

Rejected alternatives:

- `ELECTRON_OZONE_PLATFORM_HINT` — removed as dead code in Electron 39
  ([electron#47983](https://github.com/electron/electron/pull/47983)).
- Setting that env var from `start-app.ts` before `require('electron')` — C++
  `main()` has already passed `PreEarlyInitialization` before any JS runs.
- `XDG_SESSION_TYPE=x11` in electron-builder's `snap.environment:` — would work,
  but `IdleTimeHandler` reads `XDG_SESSION_TYPE` to pick an idle-detection
  method, so this would silently break GNOME Wayland idle detection.

### Why the programmatic guards in `start-app.ts` stay

Two blocks in `start-app.ts` also append `--ozone-platform=x11`, and both are
still load-bearing:

- The **proactive Snap block** widens to X11 whenever `$SNAP` is set and the
  session is Wayland _or_ `gnome-platform` is empty. The missing-`gnome-platform`
  leg has no wrapper equivalent — the wrapper only checks the session — so this
  covers a case argv injection does not.
- The **reactive GPU startup guard** (the crash-marker path from PR #7273) stacks
  the flag with `--disable-gpu` and `--disable-software-rasterizer`. Flatpak and
  other non-Snap Wayland hosts get no wrapper at all, so there this is the only
  thing setting it.

On Snap+Wayland the wrapper makes both redundant, which is harmless — Chromium's
argv parsing is last-wins. Removing them would regress the two cases above.

## Removal conditions

Retire the wrapper when either holds:

- **The Snap migrates to core24 + `gpu-2404`.** That resolves the Mesa ABI drift
  and the Wayland path works again. Note the wrapper costs nothing after that —
  the X11 fallback only fires under our `$SNAP` — so migration permits removal
  rather than requiring it.
- **Chromium's argv/`appendSwitch` divergence is fixed upstream.** Unlikely: the
  §18.7 trace shows the divergence is structural (a memoized read that precedes
  JS), not a bug awaiting a patch.
