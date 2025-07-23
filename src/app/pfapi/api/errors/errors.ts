import { IValidation } from 'typia';
import { AllModelData } from '../pfapi.model';
import { PFLog } from '../../../core/log';

class AdditionalLogErrorBase<T = unknown[]> extends Error {
  additionalLog: T;

  // TODO improve typing here
  constructor(...additional: unknown[]) {
    super(typeof additional[0] === 'string' ? additional[0] : new.target.name);

    if (additional.length > 0) {
      // PFLog.critical( this.name, ...additional);
      PFLog.log(this.name, ...additional);
      try {
        PFLog.log('additional error log: ' + JSON.stringify(additional));
      } catch (e) {
        PFLog.log('additional error log not stringified: ', additional, e);
      }
    }
    this.additionalLog = additional as T;
  }
}

export class ImpossibleError extends Error {
  override name = ' ImpossibleError';
}

// --------------API ERRORS--------------
export class NoRevAPIError extends AdditionalLogErrorBase {
  override name = ' NoRevAPIError';
}

export class TooManyRequestsAPIError extends AdditionalLogErrorBase {
  override name = ' TooManyRequestsAPIError';
}

export class NoEtagAPIError extends AdditionalLogErrorBase {
  override name = ' NoEtagAPIError';
}

export class FileExistsAPIError extends Error {
  override name = ' FileExistsAPIError';
}

export class RemoteFileNotFoundAPIError extends AdditionalLogErrorBase {
  override name = ' RemoteFileNotFoundAPIError';
}

export class MissingRefreshTokenAPIError extends Error {
  override name = ' MissingRefreshTokenAPIError';
}

export class FileHashCreationAPIError extends AdditionalLogErrorBase {
  override name = ' FileHashCreationAPIError';
}

export class UploadRevToMatchMismatchAPIError extends AdditionalLogErrorBase {
  override name = ' UploadRevToMatchMismatchAP';
}

// export class CannotCreateFolderAPIError extends AdditionalLogErrorBase {
//   override name = 'CannotCreateFolderAPIError';
// }

export class HttpNotOkAPIError extends AdditionalLogErrorBase {
  override name = ' HttpNotOkAPIError';
  response: Response;

  constructor(response: Response) {
    super(response);
    this.response = response;
  }
}

// NOTE: we can't know for sure without complicating things
export class PotentialCorsError extends AdditionalLogErrorBase {
  override name = 'PotentialCorsError';
  url: string;

  constructor(url: string, ...args: unknown[]) {
    super(
      `Cross-Origin Request Blocked: The request to ${url} was blocked by CORS policy`,
      ...args,
    );
    this.url = url;
  }
}

// --------------SYNC PROVIDER ERRORS--------------

export class MissingCredentialsSPError extends Error {
  override name = 'MissingCredentialsSPError';
}

export class AuthFailSPError extends AdditionalLogErrorBase {
  override name = 'AuthFailSPError';
}

export class InvalidDataSPError extends AdditionalLogErrorBase {
  override name = 'InvalidDataSPError';
}

// --------------OTHER SYNC ERRORS--------------
export class NoSyncProviderSetError extends Error {
  override name = 'NoSyncProviderSetError';
}

export class RevMismatchForModelError extends AdditionalLogErrorBase<string> {
  override name = 'RevMismatchForModelError';
}

export class UnknownSyncStateError extends Error {
  override name = 'UnknownSyncStateError';
}

export class SyncInvalidTimeValuesError extends AdditionalLogErrorBase {
  override name = 'SyncInvalidTimeValuesError';
}

export class RevMapModelMismatchErrorOnDownload extends AdditionalLogErrorBase {
  override name = 'RevMapModelMismatchErrorOnDownload';
}

export class RevMapModelMismatchErrorOnUpload extends AdditionalLogErrorBase {
  override name = 'RevMapModelMismatchErrorOnUpload';
}

export class NoRemoteModelFile extends AdditionalLogErrorBase<string> {
  override name = 'NoRemoteModelFile';
}

export class NoRemoteMetaFile extends Error {
  override name = 'NoRemoteMetaFile';
}

export class RemoteFileChangedUnexpectedly extends AdditionalLogErrorBase {
  override name = 'RemoteFileChangedUnexpectedly';
}

// --------------LOCKFILE ERRORS--------------
export class LockPresentError extends Error {
  override name = 'LockPresentError';
}

export class LockFromLocalClientPresentError extends Error {
  override name = 'LockFromLocalClientPresentError';
}

// -----ENCRYPTION & COMPRESSION----
export class DecryptNoPasswordError extends AdditionalLogErrorBase {
  override name = 'DecryptNoPasswordError';
}

export class DecryptError extends AdditionalLogErrorBase {
  override name = 'DecryptError';
}

export class CompressError extends AdditionalLogErrorBase {
  override name = 'CompressError';
}

export class DecompressError extends AdditionalLogErrorBase {
  override name = 'DecompressError';
}

// --------------MODEL AND DB ERRORS--------------
export class ClientIdNotFoundError extends Error {
  override name = 'ClientIdNotFoundError';
}

export class DBNotInitializedError extends Error {
  override name = 'DBNotInitializedError';
}

export class InvalidMetaError extends AdditionalLogErrorBase {
  override name = 'InvalidMetaError';
}

export class MetaNotReadyError extends AdditionalLogErrorBase {
  override name = 'MetaNotReadyError';
}

export class InvalidRevMapError extends AdditionalLogErrorBase {
  override name = 'InvalidRevMapError';
}

export class ModelIdWithoutCtrlError extends AdditionalLogErrorBase {
  override name = 'ModelIdWithoutCtrlError';
}

export class ModelMigrationError extends AdditionalLogErrorBase {
  override name = 'ModelMigrationError';
}

export class CanNotMigrateMajorDownError extends AdditionalLogErrorBase {
  override name = 'CanNotMigrateMajorDownError';
}

export class ModelRepairError extends AdditionalLogErrorBase {
  override name = 'ModelRepairError';
}

export class InvalidModelCfgError extends AdditionalLogErrorBase {
  override name = 'InvalidModelCfgError';
}

export class InvalidSyncProviderError extends Error {
  override name = 'InvalidSyncProviderError';
}

export class ModelValidationError extends Error {
  override name = 'ModelValidationError';
  additionalLog?: string;

  constructor(params: {
    id: string;
    data: unknown;
    validationResult?: IValidation<any>;
    e?: unknown;
  }) {
    super('ModelValidationError');
    PFLog.log(`ModelValidationError for model ${params.id}:`, params);

    if (params.validationResult) {
      PFLog.log('validation result: ', params.validationResult);

      try {
        if ('errors' in params.validationResult) {
          const str = JSON.stringify(params.validationResult.errors);
          PFLog.log('validation errors: ' + str);
          this.additionalLog = `Model: ${params.id}, Errors: ${str.substring(0, 400)}`;
        }
      } catch (e) {
        PFLog.err('Error stringifying validation errors:', e);
      }
    }

    if (params.e) {
      PFLog.log('Additional error:', params.e);
    }
  }
}

export class DataValidationFailedError extends Error {
  override name = 'DataValidationFailedError';
  additionalLog?: string;

  constructor(validationResult: IValidation<AllModelData<any>>) {
    super('DataValidationFailedError');
    PFLog.log('validation result: ', validationResult);

    try {
      if ('errors' in validationResult) {
        const str = JSON.stringify(validationResult.errors);
        PFLog.log('validation errors_: ' + str);
        this.additionalLog = str.substring(0, 400);
      }
      PFLog.log('validation result_: ' + JSON.stringify(validationResult));
    } catch (e) {
      PFLog.err('Failed to stringify validation errors:', e);
    }
  }
}

export class ModelVersionToImportNewerThanLocalError extends AdditionalLogErrorBase {
  override name = 'ModelVersionToImportNewerThanLoca';
}

// --------------OTHER--------------

export class InvalidFilePrefixError extends AdditionalLogErrorBase {
  override name = 'InvalidFilePrefixError';
}

export class DataRepairNotPossibleError extends AdditionalLogErrorBase {
  override name = 'DataRepairNotPossibleError';
}

export class NoRepairFunctionProvidedError extends Error {
  override name = 'NoRepairFunctionProvidedError';
}

export class NoValidateFunctionProvidedError extends Error {
  override name = 'NoValidateFunctionProvidedError';
}

export class BackupImportFailedError extends AdditionalLogErrorBase {
  override name = 'BackupImportFailedError';
}

export class WebCryptoNotAvailableError extends Error {
  override name = 'WebCryptoNotAvailableError';
}
