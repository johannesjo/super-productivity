// SETTINGS (not configurable under config)
import { loadFromLs, saveToLs } from '../../core/persistence/local-storage';
import { LS_GOOGLE_LOCAL_LAST_SYNC, LS_GOOGLE_SESSION } from '../../core/persistence/ls-keys.const';

export type GoogleSession = Readonly<{
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
}>;

const DEFAULT_GOOGLE_SESSION: GoogleSession = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null
};

export const getGoogleSession = (): GoogleSession => {
  return loadFromLs(LS_GOOGLE_SESSION) || DEFAULT_GOOGLE_SESSION;
};

export const updateGoogleSession = (googleSession: Partial<GoogleSession>) => {
  const current = getGoogleSession();

  return saveToLs(LS_GOOGLE_SESSION, {
    ...current,
    ...googleSession,
  });
};

export const getGoogleLocalLastSync = (): number => {
  const la = localStorage.getItem(LS_GOOGLE_LOCAL_LAST_SYNC);
  // NOTE: we need to parse because new Date('1570549698000') is "Invalid Date"
  return Number.isNaN(Number(la))
    ? null
    : +la;
};

export const saveGoogleLocalLastSync = (lastSyncStamp: number | string) => {
  if (typeof lastSyncStamp === 'string') {
    lastSyncStamp = new Date(lastSyncStamp).getTime();
  }

  localStorage.setItem(
    LS_GOOGLE_LOCAL_LAST_SYNC,
    (Number.isInteger(lastSyncStamp) && lastSyncStamp > 0)
      ? lastSyncStamp.toString()
      : ''
  );
};
