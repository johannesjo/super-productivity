// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFAuthFailError extends Error {
  override name = PFNoRemoteMetaFile.name.replace('PF', '');

  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFHttpError extends Error {
  override name = PFHttpError.name.replace('PF', '');

  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}

export class PFHttpRealError extends Error {
  override name = PFHttpRealError.name.replace('PF', '');

  constructor(
    message: string,
    public statusCode: number,
    // TODO check
    // public cause: Error,
  ) {
    super(message);
  }
}

export class PFNoRemoteMetaFile extends Error {
  override name = PFNoRemoteMetaFile.name.replace('PF', '');

  constructor(
    message?: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.originalError = originalError;
    // Maintains proper stack trace for where our error was thrown (where the new error was created)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PFNoRemoteDataError);
    }
  }
}

export class PFNoRemoteDataError extends Error {
  override name = PFNoRemoteDataError.name.replace('PF', '');

  constructor(
    message?: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.originalError = originalError;
    // Maintains proper stack trace for where our error was thrown (where the new error was created)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PFNoRemoteDataError);
    }
  }
}

export class PFNoRevError extends Error {
  override name = PFNoRevError.name.replace('PF', '');

  constructor(message?: string) {
    super(message);
  }
}

export class PFRevMismatchError extends Error {
  override name = PFRevMismatchError.name.replace('PF', '');

  constructor(message?: string) {
    super(message);
  }
}

export class PFAuthNotConfiguredError extends Error {
  override name = PFAuthNotConfiguredError.name.replace('PF', '');

  constructor(message?: string) {
    super(message);
  }
}

export class PFInvalidDataError extends Error {
  override name = PFInvalidDataError.name.replace('PF', '');

  constructor(data: unknown, message?: string) {
    super(message);
    console.log(this.name, { data });
  }
}

export class PFInitializationError extends Error {
  override name = PFInitializationError.name.replace('PF', '');

  constructor(message: string) {
    super(message);
  }
}

export class PFSyncError extends Error {
  override name = PFSyncError.name.replace('PF', '');

  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
  }
}

export class PFLockFileTimeout extends Error {
  override name = PFSyncError.name.replace('PF', '');

  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
  }
}
