import { pfLog } from '../util/log';

class AdditionalLogErrorBase extends Error {
  constructor(...additional: any) {
    super(...additional);
    pfLog(1, this.name, ...additional);
  }
}

/// -------------------------
export class NoRevError extends Error {
  override name = NoRevError.name;
}

export class NoSyncProviderSetError extends Error {
  override name = NoSyncProviderSetError.name;
}

export class RevMismatchError extends Error {
  override name = RevMismatchError.name;
}

export class AuthNotConfiguredError extends Error {
  override name = AuthNotConfiguredError.name;
}

export class LockFileTimeoutError extends Error {
  override name = LockFileTimeoutError.name;
}

export class LockFilePresentError extends Error {
  override name = LockFilePresentError.name;
}

export class UnableToWriteLockFile extends Error {
  override name = UnableToWriteLockFile.name;
}

export class ClientIdNotFoundError extends Error {
  override name = ClientIdNotFoundError.name;
}

export class DBNotInitializedError extends Error {
  override name = DBNotInitializedError.name;
}

export class UnknownSyncStateError extends Error {
  override name = DBNotInitializedError.name;
}

export class InvalidMetaError extends AdditionalLogErrorBase {
  override name = InvalidMetaError.name;
}

export class MetaNotReadyError extends AdditionalLogErrorBase {
  override name = MetaNotReadyError.name;
}

export class InvalidFilePrefixError extends Error {
  override name = InvalidFilePrefixError.name;
}

export class SyncInvalidTimeValuesError extends AdditionalLogErrorBase {
  override name = SyncInvalidTimeValuesError.name;
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

export class ImpossibleError extends Error {
  override name = ImpossibleError.name;
}

export class InvalidSyncProviderError extends Error {
  override name = InvalidSyncProviderError.name;
}

export class TooManyRequestsError extends AdditionalLogErrorBase {
  override name = TooManyRequestsError.name;
}

// ----------------------------

export class AuthFailError extends Error {
  override name = AuthFailError.name;

  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}

export class HttpRealError extends Error {
  override name = HttpRealError.name;

  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}

export class NoRemoteMetaFile extends Error {
  override name = NoRemoteMetaFile.name;
}

export class NoRemoteDataError extends AdditionalLogErrorBase {
  override name = NoRemoteDataError.name;
}

export class InvalidDataError extends Error {
  override name = InvalidDataError.name;

  constructor(data: unknown, message?: string) {
    super(message);
    console.log(this.name, { data });
  }
}
