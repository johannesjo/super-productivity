// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFAPIAuthFailError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AuthFailError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFAPIHttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFAPINoDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoDataError';
  }
}
