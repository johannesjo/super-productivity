// SETTINGS (not configurable under config)
import { loadFromRealLs, saveToRealLs } from '../../core/persistence/local-storage';
import { LS_GOOGLE_LOCAL_LAST_SYNC, LS_GOOGLE_SESSION } from '../../core/persistence/ls-keys.const';

export type GoogleSession = Readonly<{
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}>;

const DEFAULT_GOOGLE_SESSION: GoogleSession = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null
};

export const getGoogleSession = (): GoogleSession => {
  return loadFromRealLs(LS_GOOGLE_SESSION) as GoogleSession || DEFAULT_GOOGLE_SESSION;
};

export const updateGoogleSession = (googleSession: Partial<GoogleSession>) => {
  const current = getGoogleSession();

  return saveToRealLs(LS_GOOGLE_SESSION, {
    ...current,
    ...googleSession,
  });
};

export const getGoogleLocalLastSync = (): number | null => {
  const la = localStorage.getItem(LS_GOOGLE_LOCAL_LAST_SYNC);
  // NOTE: we need to parse because new Date('1570549698000') is "Invalid Date"
  return Number.isNaN(Number(la))
    ? null
    : +(la as any);
};

export const saveGoogleLocalLastSync = (lastSyncStamp: number | string | null) => {
  if (typeof lastSyncStamp === 'string') {
    lastSyncStamp = new Date(lastSyncStamp).getTime();
  }

  localStorage.setItem(
    LS_GOOGLE_LOCAL_LAST_SYNC,
    (lastSyncStamp && Number.isInteger(lastSyncStamp) && lastSyncStamp > 0)
      ? lastSyncStamp.toString()
      : ''
  );
};
