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

export class PFAuthNotConfigured extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'PFAuthNotConfigured';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFInvalidDataError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidData';
  }
}
