import { environment } from '../../../../environments/environment';

export const DROPBOX_APP_KEY = 'm7w85uty7m745ph';
export const DROPBOX_APP_FOLDER = 'super_productivity';
export const DROPBOX_SYNC_FILE_NAME = environment.production ? 'sp.json' : 'sp-dev.json';
export const DROPBOX_SYNC_FILE_PATH = `/${DROPBOX_APP_FOLDER}/${DROPBOX_SYNC_FILE_NAME}`;
