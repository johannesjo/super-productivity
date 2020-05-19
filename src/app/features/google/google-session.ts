// SETTINGS (not configurable under config)
import {loadFromLs, saveToLs} from '../../core/persistence/local-storage';
import {LS_GOOGLE_SESSION} from '../../core/persistence/ls-keys.const';

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
