// Jest setup file
// Add any global test setup here

// Mock console methods to reduce noise in tests
if (typeof jest !== 'undefined') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
