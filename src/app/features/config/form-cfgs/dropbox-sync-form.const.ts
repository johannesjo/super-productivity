// tslint:disable:max-line-length
import { T } from '../../../t.const';
import { ConfigFormSection, DropboxSyncConfig } from '../global-config.model';
import { DROPBOX_AUTH_CODE_URL } from '../../dropbox/dropbox.const';

export const DROPBOX_SYNC_FORM: ConfigFormSection<DropboxSyncConfig> = {
  title: T.F.DROPBOX.FORM.TITLE,
  key: 'dropboxSync',
  items: [
    {
      type: 'tpl',
      templateOptions: {
        tag: 'p',
        // text: `<p>Please open the following link and copy the auth code provided there</p>`,
        text: T.F.DROPBOX.FORM.FOLLOW_LINK,
      },
    }, {
      type: 'tpl',
      templateOptions: {
        tag: 'p',
        text: `<a href="${DROPBOX_AUTH_CODE_URL}" target="_blank">https://www.dropbox.com/oauth2/authorize?response_type=code</a>`,
      },
    },
    {
      key: 'authCode',
      type: 'input',
      templateOptions: {
        label: T.F.DROPBOX.FORM.L_AUTH_CODE,
      },
    },
    {
      type: 'tpl',
      hideExpression: ((model: DropboxSyncConfig) => !!model.accessToken || !model.authCode),
      templateOptions: {
        tag: 'button',
        class: 'mat-raised-button',
        text: T.F.DROPBOX.FORM.B_GENERATE_TOKEN,
      },
    },
    {
      key: 'accessToken',
      type: 'input',
      hideExpression: ((model: DropboxSyncConfig) => !model.accessToken),
      templateOptions: {
        label: T.F.DROPBOX.FORM.L_ACCESS_TOKEN,
      },
    },
    {
      key: 'isEnabled',
      type: 'checkbox',
      // type: 'toggle',
      // NOTE: we don't hide because model updates don't seem to work properly for this
      // hideExpression: ((model: DropboxSyncConfig) => !model.accessToken),
      templateOptions: {
        label: T.F.DROPBOX.FORM.L_ENABLE_SYNCING,
      },
    },
    {
      key: 'syncInterval',
      type: 'duration',
      // NOTE: we don't hide because model updates don't seem to work properly for this
      // hideExpression: ((model: DropboxSyncConfig) => !model.accessToken),
      templateOptions: {
        isAllowSeconds: true,
        label: T.F.DROPBOX.FORM.L_SYNC_INTERVAL,
      },
    },
  ]
};
