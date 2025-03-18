// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class AuthFailError extends Error {
  override name = NoRemoteMetaFile.name.replace('', '');

  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class HttpError extends Error {
  override name = HttpError.name.replace('', '');

  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}

export class HttpRealError extends Error {
  override name = HttpRealError.name.replace('', '');

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
  override name = NoRemoteMetaFile.name.replace('', '');

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
  override name = NoRemoteDataError.name.replace('', '');

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
  override name = NoRevError.name.replace('', '');

  constructor(message?: string) {
    super(message);
  }
}

export class NoSyncProviderSet extends Error {
  override name = NoSyncProviderSet.name.replace('', '');

  constructor(message?: string) {
    super(message);
  }
}

export class RevMismatchError extends Error {
  override name = RevMismatchError.name.replace('', '');

  constructor(message?: string) {
    super(message);
  }
}

export class AuthNotConfiguredError extends Error {
  override name = AuthNotConfiguredError.name.replace('', '');

  constructor(message?: string) {
    super(message);
  }
}

export class InvalidDataError extends Error {
  override name = InvalidDataError.name.replace('', '');

  constructor(data: unknown, message?: string) {
    super(message);
    console.log(this.name, { data });
  }
}

export class InitializationError extends Error {
  override name = InitializationError.name.replace('', '');

  constructor(message: string) {
    super(message);
  }
}

export class SyncError extends Error {
  override name = SyncError.name.replace('', '');

  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
  }
}

export class LockFileTimeout extends Error {
  override name = SyncError.name.replace('', '');

  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
  }
}
