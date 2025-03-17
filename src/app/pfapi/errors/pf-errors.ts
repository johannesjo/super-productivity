// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFAuthFailError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AuthFailError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFHttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class PFHttpRealError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public cause: Error,
  ) {
    super(message);
    this.name = 'HttpRealError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFNoDataError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'NoDataError';
  }
}

export class PFNoRevError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'NoRevError';
  }
}
export class PFRevMismatchError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'RevMismatchError';
  }
}

export class PFAuthNotConfiguredError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'PFAuthNotConfiguredError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFInvalidDataError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidDataError';
  }
}

export class PFInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PFInitializationError';
  }
}

export class PFSyncError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'PFSyncError';
  }
}
