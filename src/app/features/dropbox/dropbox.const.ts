import { environment } from '../../../environments/environment';
import { generatePKCECodes } from './generate-pkce-codes';

export const DROPBOX_APP_KEY = 'm7w85uty7m745ph';
export const DROPBOX_APP_FOLDER = 'super_productivity';
export const DROPBOX_MIN_SYNC_INTERVAL = 5000;
export const DROPBOX_SYNC_FILE_NAME = environment.production
  ? 'sp.json'
  : 'sp-dev.json';
export const DROPBOX_SYNC_FILE_PATH = `/${DROPBOX_APP_FOLDER}/${DROPBOX_SYNC_FILE_NAME}`;
export const DROPBOX_BEFORE_CLOSE_ID = 'DROPBOX';

const {codeVerifier, codeChallenge} = generatePKCECodes();

export const DROPBOX_CODE_VERIFIER = codeVerifier;
export const DROPBOX_AUTH_CODE_URL = `https://www.dropbox.com/oauth2/authorize`
  + `?response_type=code&client_id=${DROPBOX_APP_KEY}`
  + '&code_challenge_method=S256'
  + `&code_challenge=${codeChallenge}`;
