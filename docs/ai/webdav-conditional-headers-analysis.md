# WebDAV Conditional Headers Analysis

## Executive Summary

Analysis of ETag vs Last-Modified conditional header mappings for WebDAV implementation, including verification against RFC 7232 (HTTP Conditional Requests) and RFC 4918 (WebDAV specification).

**Key Finding**: The proposed mapping contains a critical conceptual error for resource creation operations.

## Original Proposed Mapping (INCORRECT)

| ETag Operation    | Current Header          | Last-Modified Equivalent           |
| ----------------- | ----------------------- | ---------------------------------- | --- |
| Create new file   | `If-None-Match: *`      | `If-None-Match: *`                 | ❌  |
| Update existing   | `If-Match: <etag>`      | `If-Unmodified-Since: <timestamp>` | ✅  |
| Check for changes | `If-None-Match: <etag>` | `If-Modified-Since: <timestamp>`   | ✅  |
| Success response  | `ETag: <etag>`          | `Last-Modified: <timestamp>`       | ✅  |
| Not modified      | `304 + ETag`            | `304 + Last-Modified`              | ✅  |
| Conflict          | `412` (ETag mismatch)   | `412` (timestamp mismatch)         | ✅  |

## Corrected Analysis

### Critical Error Identified

The "Create new file" row contains a fundamental conceptual error:

- `If-None-Match: *` is an **ETag-based** header, not a Last-Modified equivalent
- Last-Modified headers cannot provide safe resource creation functionality

### Corrected Mapping

| ETag Operation    | ETag Header             | Last-Modified Equivalent                     |
| ----------------- | ----------------------- | -------------------------------------------- |
| Create new file   | `If-None-Match: *`      | **❌ NO EQUIVALENT** (concept doesn't apply) |
| Update existing   | `If-Match: <etag>`      | `If-Unmodified-Since: <timestamp>`           |
| Check for changes | `If-None-Match: <etag>` | `If-Modified-Since: <timestamp>`             |
| Success response  | `ETag: <etag>`          | `Last-Modified: <timestamp>`                 |
| Not modified      | `304 + ETag`            | `304 + Last-Modified`                        |
| Conflict          | `412` (ETag mismatch)   | `412` (timestamp mismatch)                   |

## RFC Analysis

### RFC 7232 (HTTP Conditional Requests)

1. **Header Evaluation Order**:

   - If-Match (if present)
   - If-Unmodified-Since (if If-Match not present)
   - If-None-Match
   - If-Modified-Since (only for GET/HEAD, if If-None-Match not present)

2. **Validator Precedence**:

   - ETags take precedence over Last-Modified when both present
   - Strong ETags preferred over weak ETags

3. **Method Restrictions**:
   - `If-Modified-Since` and `If-Unmodified-Since` only valid for GET/HEAD requests
   - `If-None-Match` and `If-Match` valid for all HTTP methods

### RFC 4918 (WebDAV Specification)

1. **Security Requirements**:

   - "The server MUST do authorization checks before checking any HTTP conditional header"

2. **ETag Importance**:

   - "Correct use of ETags is even more important in a distributed authoring environment"
   - "ETags are necessary along with locks to avoid the lost-update problem"
   - "Strong ETags are much more useful for authoring use cases than weak ETags"

3. **Namespace Operations**:
   - For COPY/MOVE operations, servers must ensure ETag values are not reused
   - ETag semantics must be preserved across namespace operations

### Current WebDAV Implementation Verification

The current implementation in `webdav-api.ts:197-212` correctly follows RFC standards:

```typescript
private _createConditionalHeaders(
  isOverwrite?: boolean,
  expectedEtag?: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!isOverwrite) {
    if (expectedEtag) {
      headers['If-Match'] = expectedEtag;     // Update existing
    } else {
      headers['If-None-Match'] = '*';         // Create new
    }
  } else if (expectedEtag) {
    headers['If-Match'] = expectedEtag;       // Force overwrite
  }
  return headers;
}
```

## Why Last-Modified Cannot Handle Resource Creation

1. **Existence vs. Temporal Comparison**:

   - `If-None-Match: *` checks for resource **existence**
   - Last-Modified headers only handle **temporal comparisons** of existing resources

2. **Method Limitations**:

   - Last-Modified conditionals (If-Modified-Since/If-Unmodified-Since) are restricted to GET/HEAD
   - Resource creation typically uses PUT/POST which cannot use these headers

3. **Conceptual Mismatch**:
   - You cannot compare timestamps for non-existent resources
   - Resource creation requires existence checking, not temporal validation

## Recommendations

1. **For ETag-capable servers**: Use `If-None-Match: *` for safe resource creation
2. **For Last-Modified-only servers**: Research alternative approaches (see separate analysis)
3. **Implementation priority**: ETags are strongly preferred for WebDAV authoring scenarios
4. **Fallback strategy**: Implement alternative creation safety mechanisms for Last-Modified-only environments

## References

- RFC 7232: Hypertext Transfer Protocol (HTTP/1.1): Conditional Requests
- RFC 4918: HTTP Extensions for Web Distributed Authoring and Versioning (WebDAV)
- Current WebDAV implementation: `src/app/pfapi/api/sync/providers/webdav/webdav-api.ts`
