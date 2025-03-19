import { pfLog } from '../util/log';

class AdditionalLogErrorBase extends Error {
  constructor(...additional: any) {
    super(...additional);
    pfLog(1, this.name, ...additional);
  }
}

export class AuthFailError extends Error {
  override name = NoRemoteMetaFile.name;

  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class HttpError extends Error {
  override name = HttpError.name;

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
    // TODO check
    // public cause: Error,
  ) {
    super(message);
  }
}

export class NoRemoteMetaFile extends Error {
  override name = NoRemoteMetaFile.name;

  constructor(
    message?: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.originalError = originalError;
    // Maintains proper stack trace for where our error was thrown (where the new error was created)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NoRemoteDataError);
    }
  }
}

export class NoRemoteDataError extends Error {
  override name = NoRemoteDataError.name;

  constructor(
    message?: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.originalError = originalError;
    // Maintains proper stack trace for where our error was thrown (where the new error was created)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NoRemoteDataError);
    }
  }
}

export class NoRevError extends Error {
  override name = NoRevError.name;

  constructor(message?: string) {
    super(message);
  }
}

export class NoSyncProviderSet extends Error {
  override name = NoSyncProviderSet.name;

  constructor(message?: string) {
    super(message);
  }
}

export class RevMismatchError extends Error {
  override name = RevMismatchError.name;

  constructor(message?: string) {
    super(message);
  }
}

export class AuthNotConfiguredError extends Error {
  override name = AuthNotConfiguredError.name;

  constructor(message?: string) {
    super(message);
  }
}

export class InvalidDataError extends Error {
  override name = InvalidDataError.name;

  constructor(data: unknown, message?: string) {
    super(message);
    console.log(this.name, { data });
  }
}

export class InitializationError extends Error {
  override name = InitializationError.name;

  constructor(message: string) {
    super(message);
  }
}

export class SyncError extends Error {
  override name = SyncError.name;

  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
  }
}

export class LockFileTimeoutError extends Error {
  override name = SyncError.name;

  constructor(
    message?: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
  }
}

export class LockFilePresentError extends Error {
  override name = SyncError.name;

  constructor(
    message?: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
  }
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

export class InvalidFilePrefixError extends Error {
  override name = InvalidFilePrefixError.name;
}

export class SyncInvalidTimeValuesError extends AdditionalLogErrorBase {
  override name = SyncInvalidTimeValuesError.name;
}

export class InvalidRevMapError extends AdditionalLogErrorBase {
  override name = InvalidRevMapError.name;
}

// export class LastSyncValNotUpToDateError extends Error {
//   override name = LastSyncValNotUpToDateError.name;
// }

export class ImpossibleError extends Error {
  override name = ImpossibleError.name;

  constructor(message?: string) {
    super(message);
  }
}
