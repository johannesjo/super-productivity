// tslint:disable:max-line-length
import {T} from '../../../t.const';
import {ConfigFormSection, DropboxSyncConfig} from '../global-config.model';
import {DROPBOX_AUTH_CODE_URL} from '../../dropbox/dropbox.const';


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
        text: `Please open the following link <a href="${DROPBOX_AUTH_CODE_URL}" target="_blank">https://www.dropbox.com/oauth2/authorize?response_type=code</a> and copy the auth code provided there`,
      },
    },
    {
      key: 'authCode',
      type: 'input',
      templateOptions: {
        label: 'Auth Code',
      },
    },
    {
      key: 'accessToken',
      type: 'input',
      hideExpression: ((model: DropboxSyncConfig) => !model.accessToken),
      templateOptions: {
        label: 'Access Token (generated from Auth Code)',
      },
    },
    {
      key: 'isEnabled',
      type: 'checkbox',
      // type: 'toggle',
      // NOTE: we don't hide because model updates don't seem to work properly for this
      // hideExpression: ((model: DropboxSyncConfig) => !model.accessToken),
      templateOptions: {
        label: 'Enable Dropbox Syncing ',
      },
    },
    {
      key: 'syncInterval',
      type: 'duration',
      // NOTE: we don't hide because model updates don't seem to work properly for this
      // hideExpression: ((model: DropboxSyncConfig) => !model.accessToken),
      templateOptions: {
        isAllowSeconds: true,
        label: 'Sync Interval',
      },
    },
  ]
};
