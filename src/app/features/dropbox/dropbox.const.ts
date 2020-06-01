import {environment} from '../../../environments/environment';

export const DROPBOX_APP_KEY = 'i6oia91nuombzkn';
export const DROPBOX_APP_SECRET = 'yehgzv2qw2egr8y';
export const DROPBOX_APP_FOLDER = 'super_productivity';
export const DROPBOX_MIN_SYNC_INTERVAL = 5000;
export const DROPBOX_SYNC_FILE_NAME = environment.production
  ? 'sp.json'
  : 'sp-dev.json';
export const DROPBOX_SYNC_FILE_PATH = `/${DROPBOX_APP_FOLDER}/${DROPBOX_SYNC_FILE_NAME}`;
export const DROPBOX_AUTH_CODE_URL = `https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=${DROPBOX_APP_KEY}`;
