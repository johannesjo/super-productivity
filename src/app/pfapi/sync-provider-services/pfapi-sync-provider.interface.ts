import { PFSyncProviderId } from '../pfapi.model';
import { PFAuthFailError, PFHttpError } from '../errors/pfapi-errors';

export type PFRequestResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type PFCommonRequestErrors = PFAuthFailError | PFHttpError;

export interface PFSyncProviderServiceInterface {
  id: PFSyncProviderId;
  isReady: boolean;
  isUploadForcePossible?: boolean;

  getFileRevAndLastClientUpdate(
    targetPath: string,
    localRev: string | null,
  ): Promise<PFRequestResult<{ rev: string }, PFCommonRequestErrors>>;

  uploadFileData(
    targetPath: string,
    dataStr: string,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<PFRequestResult<{ rev: string }, PFCommonRequestErrors>>;

  downloadFileData(
    targetPath: string,
    localRev: string | null,
  ): Promise<PFRequestResult<{ rev: string; dataStr: string }, PFCommonRequestErrors>>;
}
