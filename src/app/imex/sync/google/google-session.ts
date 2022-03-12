// SETTINGS (not configurable under config)
import { loadFromRealLs, saveToRealLs } from '../../../core/persistence/local-storage';
import { LS } from '../../../core/persistence/storage-keys.const';

export type GoogleSession = Readonly<{
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}>;

const DEFAULT_GOOGLE_SESSION: GoogleSession = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

export const getGoogleSession = (): GoogleSession => {
  return (loadFromRealLs(LS.GOOGLE_SESSION) as GoogleSession) || DEFAULT_GOOGLE_SESSION;
};

export const updateGoogleSession = (googleSession: Partial<GoogleSession>): void => {
  const current = getGoogleSession();
  saveToRealLs(LS.GOOGLE_SESSION, {
    ...current,
    ...googleSession,
  });
};
