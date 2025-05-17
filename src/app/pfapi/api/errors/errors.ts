import { IValidation } from 'typia';
import { AllModelData } from '../pfapi.model';

class AdditionalLogErrorBase<T = unknown[]> extends Error {
  additionalLog: T;

  // TODO improve typing here
  constructor(...additional: unknown[]) {
    super(typeof additional[0] === 'string' ? additional[0] : new.target.name);

    if (additional.length > 0) {
      // pfLog(0, this.name, ...additional);
      console.log(this.name, ...additional);
      try {
        console.log('additional error log: ' + JSON.stringify(additional));
      } catch (e) {
        console.log('additional error log not stringified: ', additional, e);
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
  override name = 'DBNotInitializedError';
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

export class ModelValidationError extends AdditionalLogErrorBase {
  override name = 'ModelValidationError';
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

export class DataValidationFailedError extends Error {
  override name = 'DataValidationFailedError';

  constructor(validationResult: IValidation<AllModelData<any>>) {
    super('DataValidationFailedError');
    console.log('validation result: ', validationResult);
    try {
      if ('errors' in validationResult) {
        console.log('validation errors_: ' + JSON.stringify(validationResult.errors));
      }
      console.log('validation result_: ' + JSON.stringify(validationResult));
    } catch (e) {}
  }
}

export class ModelVersionToImportNewerThanLocalError extends AdditionalLogErrorBase {
  override name = 'ModelVersionToImportNewerThanLoca';
}

// --------------OTHER--------------

export class InvalidFilePrefixError extends Error {
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
