# WebDAV Implementation Plan: Support for Non-ETag Servers

! Commit after each step !

## 🎯 Objective

Extend the current WebDAV implementation to support servers that don't provide ETags, while maintaining full backward compatibility and ensuring all existing unit tests continue to pass.

## 📋 Implementation Strategy

### Phase 1: Analysis & Foundation (Safe Changes)

**Goal**: Understand current implementation and prepare for changes without breaking existing functionality.

#### 1.1 Analyze Current Implementation

- **File**: `src/app/pfapi/api/sync/providers/webdav/webdav-api.ts`
- **Action**: Document current ETag usage patterns
- **Test Requirement**: ✅ All existing tests must pass
- **Verification**: `npm run test:file src/app/pfapi/api/sync/providers/webdav/webdav-api.spec.ts`

#### 1.2 Review Test Coverage

- **Files**: All `webdav-*.spec.ts` files
- **Action**: Identify ETag-dependent tests and ensure they remain valid
- **Test Requirement**: ✅ Document which tests validate ETag behavior

#### 1.3 Create Fallback Strategy Design

- **Action**: Design capability detection and fallback mechanisms
- **Test Requirement**: ✅ No code changes yet - design only
- when server does not support etags (`NoRevAPIError`), we should check support (see 2.2) and switch to fallback mode for all other requests in this session and retry current request with the other approach once

### Phase 2: Server Capability Detection (Incremental)

**Goal**: Add ability to detect server capabilities without breaking existing ETag functionality.

#### 2.1 Add Server Capability Detection Interface

```typescript
interface WebdavServerCapabilities {
  supportsETags: boolean;
  supportsIfHeader: boolean;
  supportsLocking: boolean;
  supportsLastModified: boolean;
}
```

- **Test Requirement**: ✅ Add new tests for capability detection
- **Verification**: Existing tests must continue to pass

#### 2.2 Implement ETag Detection Method

```typescript
private async _detectETagSupport(path: string): Promise<boolean>
```

- **Action**: Test server response for ETag headers
- **Test Requirement**: ✅ Mock servers with/without ETag support
- **Verification**: `npm run test:file <updated-spec-file>`

### Phase 3: Last-Modified Support (Parallel Implementation)

**Goal**: Add Last-Modified support alongside existing ETag functionality.

#### 3.1 Extend Response Header Processing

```typescript
private _extractValidators(headers: Record<string, string>): {
  etag?: string;
  lastModified?: string;
  validator: string; // The chosen validator
  validatorType: 'etag' | 'last-modified';
}
```

- **Test Requirement**: ✅ Test both ETag and Last-Modified extraction
- **Verification**: Existing ETag tests must still pass

#### 3.2 Add Last-Modified Conditional Headers

```typescript
private _createConditionalHeaders(
  isOverwrite?: boolean,
  expectedEtag?: string | null,
  expectedLastModified?: string | null,
  preferLastModified?: boolean
): Record<string, string>
```

- **Test Requirement**: ✅ Test all conditional header combinations
- **Verification**: Existing conditional header tests must pass

#### 3.3 Update Core Methods with Fallback Logic

- **Methods**: `upload()`, `download()`, `getFileMeta()`, `remove()`
- **Strategy**: Try ETag first, fallback to Last-Modified if needed
- **Test Requirement**: ✅ Test both code paths for each method

### Phase 4: Alternative Creation Methods (Advanced)

**Goal**: Implement safe resource creation for non-ETag servers.

#### 4.1 WebDAV If Header Support

```typescript
private _createWebDAVIfHeader(condition: 'not-exists' | 'match', value?: string): string
```

- **Test Requirement**: ✅ Mock WebDAV If header responses
- **Verification**: Existing creation tests must pass

#### 4.2 HEAD-then-PUT Fallback

```typescript
private async _createWithExistenceCheck(path: string, data: string): Promise<string>
```

- **Test Requirement**: ✅ Test race condition handling
- **Verification**: Document race condition limitations

### Phase 5: Testing & Validation (Critical)

**Goal**: Comprehensive test coverage without breaking existing functionality.

#### 5.1 Mock Server Scenarios

- **ETag-only servers** (existing behavior)
- **Last-Modified-only servers** (new behavior)
- **No conditional header support** (fallback behavior)
- **Mixed capability servers** (detection behavior)

#### 5.2 Integration Tests

```typescript
describe('WebDAV Non-ETag Server Support', () => {
  describe('Last-Modified fallback', () => {
    it('should use Last-Modified when ETag unavailable');
    it('should prefer ETag when both available');
    it('should handle missing timestamps gracefully');
  });

  describe('Safe resource creation', () => {
    it('should use If-None-Match when ETag available');
    it('should fallback to WebDAV If header');
    it('should fallback to LOCK/UNLOCK mechanism');
    it('should fallback to HEAD-then-PUT with warnings');
  });
});
```

## 🧪 Test Strategy

### Continuous Verification Protocol

1. **Before Any Changes**:

   ```bash
   npm run test:file src/app/pfapi/api/sync/providers/webdav/webdav-api.spec.ts
   npm run test:file src/app/pfapi/api/sync/providers/webdav/webdav.spec.ts
   ```

2. **After Each Phase**:

   ```bash
   npm run test  # Full test suite
   npm run checkFile src/app/pfapi/api/sync/providers/webdav/webdav-api.ts
   npm run lint
   ```

3. **Integration Testing**:
   ```bash
   npm run e2e  # WebDAV e2e tests
   ```

### Test Data Requirements

#### Mock Responses for Different Server Types

```typescript
// ETag-capable server (existing)
const etagResponse = {
  headers: { etag: '"abc123"' },
  status: 200,
};

// Last-Modified-only server (new)
const lastModifiedResponse = {
  headers: { 'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT' },
  status: 200,
};

// Minimal server (fallback)
const minimalResponse = {
  headers: {},
  status: 200,
};
```

### Performance Considerations

1. **Capability detection caching**: Avoid repeated server capability checks
2. **Minimal overhead for ETag servers**: No performance regression for existing servers
3. **Graceful degradation**: Fallback methods clearly documented as slower/less reliable

## 🎯 Success Criteria

1. ✅ **Zero test regressions**: All existing WebDAV tests continue to pass
2. ✅ **ETag server performance**: No performance degradation for ETag-capable servers
3. ✅ **Last-Modified support**: Functional sync with Last-Modified-only servers
4. ✅ **Graceful degradation**: Clear fallback behavior for limited servers
5. ✅ **Documentation**: Comprehensive server compatibility matrix
6. ✅ **Configuration**: Optional server capability overrides for testing

## 📝 Implementation Notes

- **Conservative approach**: Preserve all existing behavior as default
- **Feature flags**: Allow testing of new functionality without affecting production
- **Comprehensive logging**: Clear indicators of which compatibility mode is active
- **Error context**: Specific error messages for different server limitation scenarios
