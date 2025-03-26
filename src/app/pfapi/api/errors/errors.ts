import { pfLog } from '../util/log';

class AdditionalLogErrorBase extends Error {
  constructor(...additional: any) {
    super(...additional);
    if (additional.length > 0) {
      pfLog(1, this.name, ...additional);
    }
  }
}

export class ImpossibleError extends Error {
  override name = ImpossibleError.name;
}

// --------------API ERRORS--------------
export class NoRevAPIError extends AdditionalLogErrorBase {
  override name = NoRevAPIError.name;
}

export class TooManyRequestsAPIError extends AdditionalLogErrorBase {
  override name = TooManyRequestsAPIError.name;
}

export class NoEtagAPIError extends AdditionalLogErrorBase {
  override name = NoEtagAPIError.name;
}

export class FileExistsAPIError extends Error {
  override name = FileExistsAPIError.name;
}

export class RemoteFileNotFoundAPIError extends AdditionalLogErrorBase {
  override name = RemoteFileNotFoundAPIError.name;
}

export class MissingRefreshTokenAPIError extends Error {
  override name = MissingRefreshTokenAPIError.name;
}

export class FileHashCreationAPIError extends AdditionalLogErrorBase {
  override name = FileHashCreationAPIError.name;
}

export class CannotCreateFolderAPIError extends AdditionalLogErrorBase {
  override name = CannotCreateFolderAPIError.name;
}

export class HttpNotOkAPIError extends AdditionalLogErrorBase {
  override name = HttpNotOkAPIError.name;
  response: Response;

  constructor(response: Response) {
    super();
    this.response = response;
  }
}

// --------------SYNC PROVIDER ERRORS--------------

export class MissingCredentialsSPError extends Error {
  override name = MissingCredentialsSPError.name;
}

export class AuthFailSPError extends AdditionalLogErrorBase {
  override name = AuthFailSPError.name;
}

export class InvalidDataSPError extends AdditionalLogErrorBase {
  override name = InvalidDataSPError.name;
}

// --------------OTHER SYNC ERRORS--------------
export class NoSyncProviderSetError extends Error {
  override name = NoSyncProviderSetError.name;
}

export class RevMismatchError extends Error {
  override name = RevMismatchError.name;
}

export class UnknownSyncStateError extends Error {
  override name = DBNotInitializedError.name;
}

export class SyncInvalidTimeValuesError extends AdditionalLogErrorBase {
  override name = SyncInvalidTimeValuesError.name;
}

export class RevMapModelMismatchErrorOnDownload extends AdditionalLogErrorBase {
  override name = RevMapModelMismatchErrorOnDownload.name;
}

export class RevMapModelMismatchErrorOnUpload extends AdditionalLogErrorBase {
  override name = RevMapModelMismatchErrorOnUpload.name;
}

export class NoRemoteMetaFile extends Error {
  override name = NoRemoteMetaFile.name;
}

// --------------LOCKFILE ERRORS--------------
export class LockFilePresentError extends Error {
  override name = LockFilePresentError.name;
}

export class LockFileFromLocalClientPresentError extends Error {
  override name = LockFileFromLocalClientPresentError.name;
}

export class UnableToWriteLockFileError extends Error {
  override name = UnableToWriteLockFileError.name;
}

export class LockFileEmptyOrMessedUpError extends Error {
  override name = LockFileEmptyOrMessedUpError.name;
}

// -----ENCRYPTION & COMPRESSION----
export class DecryptNoPasswordError extends AdditionalLogErrorBase {
  override name = DecryptNoPasswordError.name;
}

export class CannotGetEncryptAndCompressCfg extends AdditionalLogErrorBase {
  override name = CannotGetEncryptAndCompressCfg.name;
}

export class CompressError extends AdditionalLogErrorBase {
  override name = CompressError.name;
}

export class DecompressError extends AdditionalLogErrorBase {
  override name = DecompressError.name;
}

// --------------MODEL AND DB ERRORS--------------
export class ClientIdNotFoundError extends Error {
  override name = ClientIdNotFoundError.name;
}

export class DBNotInitializedError extends Error {
  override name = DBNotInitializedError.name;
}

export class InvalidMetaError extends AdditionalLogErrorBase {
  override name = InvalidMetaError.name;
}

export class MetaNotReadyError extends AdditionalLogErrorBase {
  override name = MetaNotReadyError.name;
}

export class InvalidRevMapError extends AdditionalLogErrorBase {
  override name = InvalidRevMapError.name;
}

export class ModelIdWithoutCtrlError extends AdditionalLogErrorBase {
  override name = ModelIdWithoutCtrlError.name;
}

export class InvalidModelCfgError extends AdditionalLogErrorBase {
  override name = InvalidModelCfgError.name;
}

export class InvalidSyncProviderError extends Error {
  override name = InvalidSyncProviderError.name;
}

export class DataValidationFailedError extends AdditionalLogErrorBase {
  override name = DataValidationFailedError.name;
}

export class ModelVersionToImportNewerThanLocalError extends AdditionalLogErrorBase {
  override name = ModelVersionToImportNewerThanLocalError.name;
}

// --------------OTHER--------------

export class InvalidFilePrefixError extends Error {
  override name = InvalidFilePrefixError.name;
}

export class DataRepairNotPossibleError extends AdditionalLogErrorBase {
  override name = DataRepairNotPossibleError.name;
}

export class NoRepairFunctionProvidedError extends Error {
  override name = NoRepairFunctionProvidedError.name;
}

export class NoValidateFunctionProvidedError extends Error {
  override name = NoValidateFunctionProvidedError.name;
}

export class BackupImportFailedError extends AdditionalLogErrorBase {
  override name = BackupImportFailedError.name;
}

export class WebCryptoNotAvailableError extends Error {
  override name = WebCryptoNotAvailableError.name;
}
