import { environment } from '../../../../environments/environment';

export const DROPBOX_APP_KEY = 'm7w85uty7m745ph';

const DROPBOX_APP_FOLDER = 'super_productivity';
const prefix = environment.production ? '' : 'dev_';
export const DROPBOX_SYNC_MAIN_FILE_PATH = `/${DROPBOX_APP_FOLDER}/${prefix}sp-main.json`;
export const DROPBOX_SYNC_ARCHIVE_FILE_PATH = `/${DROPBOX_APP_FOLDER}/${prefix}sp-archive.json`;
