// tslint:disable:max-line-length
import { T } from '../../../t.const';
import { ConfigFormSection, SyncConfig } from '../global-config.model';
import { SyncProvider } from '../../../imex/sync/sync-provider.model';

export const SYNC_FORM: ConfigFormSection<SyncConfig> = {
  title: T.F.DROPBOX.FORM.TITLE,
  key: 'sync',
  customSection: 'SYNC',
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
  ]
};
