// tslint:disable:max-line-length
import { T } from '../../../t.const';
import { ConfigFormSection, DropboxSyncConfig, SyncConfig } from '../global-config.model';
import { SyncProvider } from '../../../imex/sync/sync-provider.model';
import { DROPBOX_AUTH_CODE_URL } from '../../dropbox/dropbox.const';

export const SYNC_FORM: ConfigFormSection<SyncConfig> = {
  title: T.F.DROPBOX.FORM.TITLE,
  key: 'sync',
  // customSection: 'SYNC',
  items: [
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
    {
      key: 'syncProvider',
      type: 'select',
      templateOptions: {
        label: T.F.SIMPLE_COUNTER.FORM.L_TYPE,
        required: true,
        options: [
          // {label: T.F.SIMPLE_COUNTER.FORM.TYPE_STOPWATCH, value: SyncProvider.Dropbox},
          {label: 'DB', value: SyncProvider.Dropbox},
          {label: 'GD', value: SyncProvider.GoogleDrive},
        ],
      },
    },
    {
      // TODO animation maybe
      hideExpression: ((m, v, field) => field?.parent?.model.syncProvider !== SyncProvider.Dropbox),
      key: 'dropboxSync',
      templateOptions: {label: 'Address'},
      fieldGroup: [
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
      ],
    },
    // {
    //   // hideExpression: 'model.syncProvider!==' + SyncProvider.GoogleDrive,
    //   key: 'googleDriveSync',
    //   // templateOptions: {label: 'Address'},
    //   fieldGroup: [{
    //     key: 'town',
    //     type: 'input',
    //     templateOptions: {
    //       required: true,
    //       type: 'text',
    //       label: 'Town',
    //     },
    //   }],
    // },
  ]
};
