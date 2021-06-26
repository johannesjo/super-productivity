/* eslint-disable max-len */
import { T } from '../../../t.const';
import { ConfigFormSection, DropboxSyncConfig, SyncConfig } from '../global-config.model';
import { SyncProvider } from '../../../imex/sync/sync-provider.model';
import { IS_F_DROID_APP } from '../../../util/is-android-web-view';

export const SYNC_FORM: ConfigFormSection<SyncConfig> = {
  title: T.F.SYNC.FORM.TITLE,
  key: 'sync',
  items: [
    {
      key: 'isEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.F.SYNC.FORM.L_ENABLE_SYNCING,
      },
    },
    {
      key: 'syncInterval',
      type: 'duration',
      // NOTE: we don't hide because model updates don't seem to work properly for this
      // hideExpression: ((model: DropboxSyncConfig) => !model.accessToken),
      templateOptions: {
        required: true,
        isAllowSeconds: true,
        label: T.F.SYNC.FORM.L_SYNC_INTERVAL,
      },
    },
    {
      key: 'syncProvider',
      type: 'select',
      templateOptions: {
        label: T.F.SYNC.FORM.L_SYNC_PROVIDER,
        required: true,
        options: [
          { label: SyncProvider.Dropbox, value: SyncProvider.Dropbox },
          ...(IS_F_DROID_APP
            ? []
            : [{ label: SyncProvider.GoogleDrive, value: SyncProvider.GoogleDrive }]),
          { label: SyncProvider.WebDAV, value: SyncProvider.WebDAV },
        ],
      },
    },
    {
      // TODO animation maybe
      hideExpression: (m, v, field) =>
        field?.parent?.model.syncProvider !== SyncProvider.Dropbox,
      key: 'dropboxSync',
      templateOptions: { label: 'Address' },
      fieldGroup: [
        {
          key: 'accessToken',
          type: 'input',
          hideExpression: (model: DropboxSyncConfig) => !model.accessToken,
          templateOptions: {
            label: T.F.SYNC.FORM.DROPBOX.L_ACCESS_TOKEN,
          },
        },
      ],
    },
    {
      hideExpression: (m, v, field) =>
        field?.parent?.model.syncProvider !== SyncProvider.GoogleDrive,
      key: 'googleDriveSync',
      // templateOptions: {label: 'Address'},
      fieldGroup: [
        {
          key: 'syncFileName',
          type: 'input',
          templateOptions: {
            required: true,
            label: T.F.SYNC.FORM.GOOGLE.L_SYNC_FILE_NAME,
          },
        },
        {
          key: 'isCompressData',
          type: 'checkbox',
          templateOptions: {
            label: T.F.SYNC.FORM.GOOGLE.L_IS_COMPRESS_DATA,
          },
        },
      ],
    },
    {
      hideExpression: (m, v, field) =>
        field?.parent?.model.syncProvider !== SyncProvider.WebDAV,
      key: 'webDav',
      // templateOptions: {label: 'Address'},
      fieldGroup: [
        {
          type: 'tpl',
          templateOptions: {
            tag: 'p',
            // text: `<p>Please open the following link and copy the auth code provided there</p>`,
            text: T.F.SYNC.FORM.WEB_DAV.CORS_INFO,
          },
        },
        {
          key: 'baseUrl',
          type: 'input',
          templateOptions: {
            required: true,
            label: T.F.SYNC.FORM.WEB_DAV.L_BASE_URL,
            description:
              '* https://your-next-cloud/nextcloud/remote.php/dav/files/yourUserName',
          },
        },
        {
          key: 'userName',
          type: 'input',
          templateOptions: {
            required: true,
            label: T.F.SYNC.FORM.WEB_DAV.L_USER_NAME,
          },
        },
        {
          key: 'password',
          type: 'input',
          templateOptions: {
            type: 'password',
            required: true,
            label: T.F.SYNC.FORM.WEB_DAV.L_PASSWORD,
          },
        },
        {
          key: 'syncFilePath',
          type: 'input',
          templateOptions: {
            required: true,
            label: T.F.SYNC.FORM.WEB_DAV.L_SYNC_FILE_PATH,
            description: '* my-sync-file.json',
          },
        },
      ],
    },
  ],
};
