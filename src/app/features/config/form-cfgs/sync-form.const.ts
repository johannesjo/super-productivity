/* eslint-disable max-len */
import { T } from '../../../t.const';
import { ConfigFormSection, DropboxSyncConfig, SyncConfig } from '../global-config.model';
import { SyncProvider } from '../../../imex/sync/sync-provider.model';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { IS_ELECTRON } from '../../../app.constants';
import { androidInterface } from '../../android/android-interface';

export const SYNC_FORM: ConfigFormSection<SyncConfig> = {
  title: T.F.SYNC.FORM.TITLE,
  key: 'sync',
  items: [
    {
      key: 'isEnabled',
      className: 'tour-isSyncEnabledToggle',
      type: 'checkbox',
      templateOptions: {
        label: T.F.SYNC.FORM.L_ENABLE_SYNCING,
      },
    },
    {
      key: 'isEncryptionEnabled',
      type: 'checkbox',
      templateOptions: {
        // TODO translation
        label: 'Enable end-to-end encryption (experimental)',
        // label: T.F.SYNC.FORM.L_ENABLE_COMPRESSION,
      },
    },
    {
      hideExpression: (model: any) => !model.isEncryptionEnabled,
      type: 'tpl',
      className: `tpl`,
      templateOptions: {
        tag: 'p',
        // TODO translation
        // text: T.GCF.AUTO_BACKUPS.LOCATION_INFO,
        text: 'IMPORTANT NOTES: Please select a password that is secure (at least 8 characters long). Please also note that <strong>you will NOT be able to access your data, if you forget this password. There is no recovery.</strong>',
      },
    },
    {
      hideExpression: (model: any) => !model.isEncryptionEnabled,
      type: 'input',
      templateOptions: {
        type: 'password',
        // TODO translation
        // label: T.F.SYNC.FORM.L_ENABLE_COMPRESSION,
        label: 'Encryption Password (DO NOT FORGET)',
      },
    },
    {
      key: 'isCompressionEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.F.SYNC.FORM.L_ENABLE_COMPRESSION,
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
        description: T.G.DURATION_DESCRIPTION,
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
          { label: SyncProvider.WebDAV, value: SyncProvider.WebDAV },
          ...(IS_ELECTRON ||
          (IS_ANDROID_WEB_VIEW &&
            (androidInterface as any).grantFilePermission &&
            androidInterface.isGrantedFilePermission)
            ? [{ label: SyncProvider.LocalFile, value: SyncProvider.LocalFile }]
            : []),
        ],
        change: (field) => {
          if (
            IS_ANDROID_WEB_VIEW &&
            field.model.syncProvider === SyncProvider.LocalFile
          ) {
            androidInterface.grantFilePermissionWrapped().then(() => {
              field.formControl?.updateValueAndValidity();
            });
          }
        },
      },
      validators: {
        validFileAccessPermission: {
          expression: (c: any) => {
            if (IS_ANDROID_WEB_VIEW && c.value === SyncProvider.LocalFile) {
              return androidInterface.isGrantedFilePermission();
            }
            return true;
          },
          message: T.F.SYNC.FORM.LOCAL_FILE.L_SYNC_FILE_PATH_PERMISSION_VALIDATION,
        },
      },
      validation: {
        show: true,
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
    IS_ANDROID_WEB_VIEW
      ? {
          hideExpression: (m, v, field) =>
            !IS_ANDROID_WEB_VIEW ||
            field?.parent?.model.syncProvider !== SyncProvider.LocalFile ||
            !androidInterface?.isGrantedFilePermission() ||
            !androidInterface?.allowedFolderPath,
          type: 'tpl',
          className: `tpl`,
          expressionProperties: {
            template: () =>
              // NOTE: hard to translate here, that's why we don't
              `<div>Granted file access permission:<br />${
                androidInterface.allowedFolderPath && androidInterface.allowedFolderPath()
              }</div>`,
          },
        }
      : {},
    {
      hideExpression: (m, v, field) =>
        field?.parent?.model.syncProvider !== SyncProvider.LocalFile,
      key: 'localFileSync',
      fieldGroup: [
        {
          key: 'syncFilePath',
          type: 'input',
          templateOptions: {
            required: true,
            label: T.F.SYNC.FORM.LOCAL_FILE.L_SYNC_FILE_PATH,
            description: T.F.SYNC.FORM.LOCAL_FILE.L_SYNC_FILE_PATH_DESCRIPTION,
            change: (field) => {
              const lastChar = field?.model.syncFilePath?.trim().slice(-1);
              if (lastChar === '/' || lastChar === '\\') {
                field.formControl?.setValue(
                  (field.model.syncFilePath += 'SP_SYNC_FILE.json'),
                );
                field.formControl?.updateValueAndValidity();
              }
            },
          },
        },
      ],
    },
    {
      hideExpression: (m, v, field) =>
        field?.parent?.model.syncProvider !== SyncProvider.WebDAV,
      key: 'webDav',
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
