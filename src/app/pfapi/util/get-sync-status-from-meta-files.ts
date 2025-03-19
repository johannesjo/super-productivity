import { MetaFileContent } from '../pfapi.model';
import { SyncStatus } from '../pfapi.const';
import { InvalidMetaFileError, NoRemoteMetaFile } from '../errors/errors';

export const getSyncStatusFromMetaFiles = (
  remoteMetaFileContent: MetaFileContent,
  localSyncMetaData: MetaFileContent,
): { status: SyncStatus; conflictData?: unknown } => {
  if (!remoteMetaFileContent) {
    throw new NoRemoteMetaFile();
  }
  if (!localSyncMetaData) {
    throw new InvalidMetaFileError('localSyncMetaData is not defined');
  }
  return {
    status: SyncStatus.UpdateRemote,
  };
};
