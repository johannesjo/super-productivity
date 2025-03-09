/* eslint-disable max-len */
import { T } from '../../../t.const';
import { ConfigFormSection, SyncConfig } from '../global-config.model';
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
            (androidInterface as any).isGrantedFilePermission)
            ? [{ label: SyncProvider.LocalFile, value: SyncProvider.LocalFile }]
            : []),
        ],
        change: (field, ev) => {
          if (
            IS_ANDROID_WEB_VIEW &&
            field.model.syncProvider === SyncProvider.LocalFile
          ) {
            // disable / enable is a workaround for the hide expression for the info file path info tpl
            field.formControl?.disable();

            androidInterface.grantFilePermissionWrapped().then(() => {
              field.formControl?.enable();
              console.log('Granted file access permission for android');
              console.log(androidInterface?.allowedFolderPath());
              field.formControl?.updateValueAndValidity();
              field.formControl?.parent?.updateValueAndValidity();
              field.formControl?.parent?.markAllAsTouched();
              field.formControl?.markAllAsTouched();
            });
          }
        },
      },
      validators: {
        validFileAccessPermission: {
          expression: (c: any) => {
            if (IS_ANDROID_WEB_VIEW && c.value === SyncProvider.LocalFile) {
              console.log(
                'Checking file access permission for android',
                androidInterface.isGrantedFilePermission(),
              );
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
    // TODO remove completely
    // {
    //   // TODO animation maybe
    //   hideExpression: (m, v, field) =>
    //     field?.parent?.model.syncProvider !== SyncProvider.Dropbox,
    //   key: 'dropboxSync',
    //   fieldGroup: [
    //     {
    //       key: 'accessToken',
    //       type: 'input',
    //       hideExpression: (model: DropboxSyncConfig) => !model?.accessToken,
    //       templateOptions: {
    //         label: T.F.SYNC.FORM.DROPBOX.L_ACCESS_TOKEN,
    //       },
    //     },
    //   ],
    // },
    IS_ANDROID_WEB_VIEW
      ? {
          hideExpression: (m, v, field) => {
            return (
              !IS_ANDROID_WEB_VIEW ||
              field?.parent?.model.syncProvider !== SyncProvider.LocalFile ||
              !androidInterface?.isGrantedFilePermission() ||
              !androidInterface?.allowedFolderPath()
            );
          },
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
        field?.parent?.model.syncProvider !== SyncProvider.LocalFile ||
        // hide for android
        IS_ANDROID_WEB_VIEW,
      key: 'localFileSync',
      fieldGroup: [
        {
          key: 'syncFolderPath',
          type: 'input',
          templateOptions: {
            required: true,
            label: T.F.SYNC.FORM.LOCAL_FILE.L_SYNC_FOLDER_PATH,
          },
        },
      ],
    },
    {
      hideExpression: (m, v, field) =>
        field?.parent?.model.syncProvider !== SyncProvider.WebDAV,
      key: 'webDav',
      fieldGroup: [
        ...(!IS_ELECTRON && !IS_ANDROID_WEB_VIEW
          ? [
              {
                type: 'tpl',
                templateOptions: {
                  tag: 'p',
                  // text: `<p>Please open the following link and copy the auth code provided there</p>`,
                  text: T.F.SYNC.FORM.WEB_DAV.CORS_INFO,
                },
              },
            ]
          : []),
        {
          key: 'baseUrl',
          type: 'input',
          templateOptions: {
            required: true,
            label: T.F.SYNC.FORM.WEB_DAV.L_BASE_URL,
            description:
              '* https://your-next-cloud/nextcloud/remote.php/dav/files/yourUserName/',
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
          key: 'syncFolderPath',
          type: 'input',
          templateOptions: {
            required: true,
            label: T.F.SYNC.FORM.WEB_DAV.L_SYNC_FOLDER_PATH,
          },
        },
      ],
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

    // COMMON SETTINGS
    {
      type: 'collapsible',
      props: { label: T.G.ADVANCED_CFG },
      fieldGroup: [
        {
          key: 'isCompressionEnabled',
          type: 'checkbox',
          templateOptions: {
            label: T.F.SYNC.FORM.L_ENABLE_COMPRESSION,
          },
        },
        {
          key: 'isEncryptionEnabled',
          type: 'checkbox',
          templateOptions: {
            label: T.F.SYNC.FORM.L_ENABLE_ENCRYPTION,
          },
        },
        {
          hideExpression: (model: any) => !model.isEncryptionEnabled,
          type: 'tpl',
          className: `tpl`,
          templateOptions: {
            tag: 'div',
            text: T.F.SYNC.FORM.L_ENCRYPTION_NOTES,
          },
        },
        {
          hideExpression: (model: any) => !model.isEncryptionEnabled,
          key: 'encryptionPassword',
          type: 'input',
          templateOptions: {
            required: true,
            type: 'password',
            label: T.F.SYNC.FORM.L_ENCRYPTION_PASSWORD,
          },
        },
      ],
    },
  ],
};
