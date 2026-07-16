export class UniqueViolationError extends Error {
  readonly code = '23505';

  constructor(message = 'Unique constraint violation', ..._details: unknown[]) {
    super(message);
    this.name = 'UniqueViolationError';
  }
}
