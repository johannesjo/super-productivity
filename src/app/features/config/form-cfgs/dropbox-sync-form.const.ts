// tslint:disable:max-line-length
import {T} from '../../../t.const';
import {ConfigFormSection, DropboxSyncConfig} from '../global-config.model';
import {DROPBOX_APP_KEY} from '../../dropbox/dropbox.const';

const DROPBOX_URL = `https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=${DROPBOX_APP_KEY}`;

export const DROPBOX_SYNC_FORM: ConfigFormSection<DropboxSyncConfig> = {
  // title: T.GCF.GOOGLE_DRIVE_SYNC.TITLE,
  title: 'DROPBOX',
  key: 'dropboxSync',
  help: T.GCF.GOOGLE_DRIVE_SYNC.HELP,
  items: [
    {
      type: 'tpl',
      // hideExpression: ((model: any) => {
      //   return model.accessToken;
      // }),
      templateOptions: {
        tag: 'p',
        text: `Please open the following link <a href="${DROPBOX_URL}" target="_blank">${DROPBOX_URL}</a> and copy the access token provided there`,
      },
    },
    {
      key: 'accessToken',
      type: 'input',
      templateOptions: {
        label: 'Access Token',
      },
    },
    {
      key: 'isEnabled',
      type: 'toggle',
      hideExpression: ((model: any) => {
        return !model.accessToken;
      }),
      templateOptions: {
        label: 'Enable Dropbox Syncing ',
      },
    },
    {
      key: 'syncInterval',
      type: 'duration',
      hideExpression: ((model: any) => {
        return !model.accessToken;
      }),
      templateOptions: {
        label: 'Sync Interval',
      },
    },
  ]
};
