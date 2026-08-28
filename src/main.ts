/**
 * `IS_ELECTRON` is derived from the userAgent, so it is true in the Quick Add
 * HUD renderer too, and every module-level `window.ea.X()` in the app runs
 * while the HUD bootstraps. The HUD's preload answers only the platform
 * predicates — a window that owns no app state has nothing to answer the rest
 * with — and a *missing* method throws in the middle of module evaluation,
 * which aborts the bootstrap and leaves the index.html splash on screen with
 * the error buried in a renderer console that has devTools disabled. That is
 * exactly how `app.constants.ts` reading `isMacOS()` bricked the HUD.
 *
 * So back the real implementations with a proxy that warns and returns
 * undefined for everything else: the HUD still boots, and a call that genuinely
 * mattered announces itself instead of failing silently.
 *
 * Installed here rather than in the preload because `contextBridge` copies own
 * properties into the main world — a proxy's traps would not survive it.
 */
const installQuickAddElectronApiShim = (): void => {
  const platformApi = window.quickAddEa as unknown as Record<string, unknown> | undefined;
  if (!platformApi) {
    return;
  }
  const warned = new Set<string>();
  window.ea = new Proxy({} as Window['ea'], {
    get: (_target, prop) => {
      if (typeof prop !== 'string') {
        return undefined;
      }
      if (prop in platformApi) {
        return platformApi[prop];
      }
      // Never hand back a callable `then`: it would make `window.ea` look like
      // a thenable to anything that awaits or resolves it.
      if (prop === 'then') {
        return undefined;
      }
      return () => {
        if (!warned.has(prop)) {
          warned.add(prop);
          console.warn(
            `[quick-add] window.ea.${prop}() is not available in the Quick Add HUD — returning undefined`,
          );
        }
        return undefined;
      };
    },
  });
};

const isQuickAddHud =
  window.location.hash.startsWith('#/quick-add') ||
  new URLSearchParams(window.location.search).has('quickAdd');

if (isQuickAddHud) {
  document.documentElement.classList.add('isQuickAddHud');
  document.body.classList.add('isQuickAddHud');
  installQuickAddElectronApiShim();
  void import('./quick-add-main');
} else {
  void import('./app-main');
}
