// SETTINGS (not configurable under config)
import { loadFromRealLs, saveToRealLs } from '../../../core/persistence/local-storage';
import { LS_GOOGLE_SESSION } from '../../../core/persistence/ls-keys.const';

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
  return (loadFromRealLs(LS_GOOGLE_SESSION) as GoogleSession) || DEFAULT_GOOGLE_SESSION;
};

export const updateGoogleSession = (googleSession: Partial<GoogleSession>) => {
  const current = getGoogleSession();

  return saveToRealLs(LS_GOOGLE_SESSION, {
    ...current,
    ...googleSession,
  });
};
