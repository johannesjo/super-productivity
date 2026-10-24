import type { App } from 'electron';
import { join } from 'path';

const USER_DATA_DIR_ARG = '--user-data-dir=';

/**
 * The userData dir this launch must use, or undefined for Electron's default.
 *
 * `--user-data-dir=<path>` wins. Otherwise a snap uses $SNAP_USER_COMMON, which
 * survives refreshes, instead of the per-revision $SNAP_USER_DATA default.
 */
export const resolveUserDataDir = ({
  argv,
  env,
  platform,
  appName,
}: {
  argv: readonly string[];
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  appName: string;
}): { dir: string; reason: 'arg' | 'snap' } | undefined => {
  const arg = argv.find((val) => val.includes(USER_DATA_DIR_ARG));
  if (arg) {
    const dir = arg
      .replace(USER_DATA_DIR_ARG, '')
      .trim()
      .replace(/[\/\\]+$/, ''); // Remove trailing slashes
    return { dir, reason: 'arg' };
  }
  if (platform === 'linux' && env.SNAP && env.SNAP_USER_COMMON) {
    return { dir: join(env.SNAP_USER_COMMON, '.config', appName), reason: 'snap' };
  }
  return undefined;
};

/**
 * Must run before `app.requestSingleInstanceLock()`: Electron creates the
 * singleton lock in the userData dir current at that call. Locking first put
 * it in the per-revision snap dir while IndexedDB lives in the common dir, so
 * instances of two snap revisions did not exclude each other and both opened
 * the same LevelDB (#11049).
 */
export const applyUserDataDir = (app: App): ReturnType<typeof resolveUserDataDir> => {
  const resolved = resolveUserDataDir({
    argv: process.argv,
    env: process.env,
    platform: process.platform,
    appName: app.getName(),
  });
  if (resolved) {
    app.setPath('userData', resolved.dir);
    if (resolved.reason === 'snap') {
      app.setAppLogsPath();
    }
  }
  return resolved;
};
