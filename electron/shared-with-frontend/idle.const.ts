/**
 * The Electron main process only forwards idle periods LONGER than this floor
 * (see `sendIdleMsgIfOverMin()` in start-app.ts), so a configured `minIdleTime`
 * below it can never trigger the idle dialog. Shared with the frontend so the
 * settings form validates against the very value the main process enforces
 * instead of a copy that can drift. See #9349.
 */
export const IDLE_MIN_IDLE_TIME_MS = 60000;

/**
 * How often the main process samples the system idle time. Detection therefore
 * lags the configured threshold by up to this much.
 */
export const IDLE_PING_INTERVAL_MS = 30000;
