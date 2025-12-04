import { DataValidationFailedError, HttpNotOkAPIError } from './errors';
import { Log, LogLevel } from '../../../core/log';

describe('HttpNotOkAPIError', () => {
  it('should successfully strip script tags (fix "kt toast" issue)', () => {
    const response = new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
    // Simulating a body where "kt toast" is inside a script tag
    const body = `
      <html>
        <head>
          <script>
            var kt = { toast: { show: function() {} } };
            kt.toast.show('Some ignored message');
          </script>
        </head>
        <body>
          <h1>Actual Error</h1>
        </body>
      </html>
    `;

    const error = new HttpNotOkAPIError(response, body);
    // The content inside <script> should now be removed
    expect(error.message).not.toContain('kt');
    expect(error.message).toContain('Actual Error');
  });
});

describe('DataValidationFailedError', () => {
  let consoleLogSpy: jasmine.Spy;
  let consoleErrorSpy: jasmine.Spy;

  beforeAll(() => {
    Log.setLevel(LogLevel.DEBUG);
  });

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log');
    consoleErrorSpy = spyOn(console, 'error');
  });

  it('should handle validation result with errors property', () => {
    const validationResult = {
      errors: [
        { path: 'test.path', expected: 'string', value: 123 },
        { path: 'another.path', expected: 'boolean', value: 'not a boolean' },
      ],
    };

    const error = new DataValidationFailedError(validationResult as any);

    expect(error.name).toBe('DataValidationFailedError');
    expect(error.additionalLog).toBeDefined();
    expect(error.additionalLog).toContain('test.path');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[pf]',
      'validation result: ',
      validationResult,
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[pf]',
      jasmine.stringContaining('validation errors_:'),
    );
  });

  it('should truncate long error strings to 400 characters', () => {
    const longError = { message: 'x'.repeat(500) };
    const validationResult = {
      errors: Array(50).fill(longError),
    };

    const error = new DataValidationFailedError(validationResult as any);

    expect(error.additionalLog).toBeDefined();
    expect(error.additionalLog!.length).toBe(400);
  });

  it('should handle validation result without errors property', () => {
    const validationResult = {
      success: false,
      message: 'Validation failed',
    };

    const error = new DataValidationFailedError(validationResult as any);

    expect(error.name).toBe('DataValidationFailedError');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[pf]',
      'validation result: ',
      validationResult,
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[pf]',
      jasmine.stringContaining('validation result_:'),
    );
  });

  it('should catch and log errors when stringifying fails', () => {
    const circularRef: any = { prop: null };
    circularRef.prop = circularRef;
    const validationResult = {
      errors: circularRef,
    };

    const error = new DataValidationFailedError(validationResult as any);

    expect(error.name).toBe('DataValidationFailedError');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[pf]',
      'Failed to stringify validation errors:',
      jasmine.any(Error),
    );
  });

  it('should not throw when validation result causes stringify error', () => {
    const validationResult = {
      get errors() {
        throw new Error('Cannot access errors');
      },
    };

    expect(() => new DataValidationFailedError(validationResult as any)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[pf]',
      'Failed to stringify validation errors:',
      jasmine.any(Error),
    );
  });
});
