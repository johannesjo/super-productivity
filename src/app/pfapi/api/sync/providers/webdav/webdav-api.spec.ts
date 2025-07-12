/* eslint-disable @typescript-eslint/naming-convention */
// This file imports all the split test files for WebdavApi
// The tests have been organized into logical groups for better maintainability

import './webdav-api-upload.spec';
import './webdav-api-download.spec';
import './webdav-api-file-operations.spec';
import './webdav-api-metadata.spec';
import './webdav-api-connection.spec';
import './webdav-api-helpers.spec';
import './webdav-api-android.spec';
import './webdav-api-additional.spec';

// Note: The original monolithic test file has been split into the following files:
// - webdav-api-upload.spec.ts: Upload operations and related error handling
// - webdav-api-download.spec.ts: Download operations, range requests, conditional downloads
// - webdav-api-file-operations.spec.ts: File/folder operations (remove, exists, create)
// - webdav-api-metadata.spec.ts: Metadata operations (getFileMeta, listFolder)
// - webdav-api-connection.spec.ts: Connection testing
// - webdav-api-helpers.spec.ts: Helper methods and utilities
// - webdav-api-android.spec.ts: Android WebView specific tests
// - webdav-api-additional.spec.ts: Additional coverage for edge cases and untested paths
// - webdav-api-test-utils.ts: Shared test utilities and mock data

describe('WebdavApi Test Suite', () => {
  it('should import all test files', () => {
    // This test ensures all split test files are loaded
    expect(true).toBe(true);
  });
});
