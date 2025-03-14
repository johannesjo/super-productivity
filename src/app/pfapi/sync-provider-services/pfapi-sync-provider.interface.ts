import { PFAPISyncProviderId } from '../pfapi.model';
import { PFAPIAuthFailError, PFAPIHttpError } from '../errors/pfapi-errors';

export type PFAPIRequestResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type PFAPICommonRequestErrors = PFAPIAuthFailError | PFAPIHttpError;

export interface PFAPISyncProviderServiceInterface {
  id: PFAPISyncProviderId;
  isReady: boolean;
  isUploadForcePossible?: boolean;

  getFileRevAndLastClientUpdate(
    targetPath: string,
    localRev: string | null,
  ): Promise<PFAPIRequestResult<{ rev: string }, PFAPICommonRequestErrors>>;

  uploadFileData(
    targetPath: string,
    dataStr: string,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<PFAPIRequestResult<{ rev: string }, PFAPICommonRequestErrors>>;

  downloadFileData(
    targetPath: string,
    localRev: string | null,
  ): Promise<
    PFAPIRequestResult<{ rev: string; dataStr: string }, PFAPICommonRequestErrors>
  >;
}
