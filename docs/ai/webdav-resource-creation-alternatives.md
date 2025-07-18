# WebDAV Resource Creation Alternatives to `If-None-Match: *`

## Executive Summary

Analysis of alternative approaches for safe resource creation in WebDAV environments where `If-None-Match: *` is not supported or unreliable, particularly focusing on servers that only support Last-Modified headers or have implementation issues with ETags.

## Background

The standard approach for safe resource creation is using `If-None-Match: *` with PUT requests to prevent overwriting existing resources. However, several scenarios require alternatives:

1. **ETag-unsupported servers**: Some WebDAV servers only support Last-Modified headers
2. **Implementation bugs**: Various servers (Nextcloud/Sabre, Lighttpd) have issues with `If-None-Match: *`
3. **Legacy compatibility**: Older WebDAV implementations may not fully support conditional headers

## Alternative Approaches

### 1. WebDAV-Specific If Header

**Description**: WebDAV defines an enhanced `If` header that provides more powerful conditional logic than standard HTTP headers.

**Advantages**:

- More flexible than `If-Match`/`If-None-Match`
- Supports complex conditional logic
- Can reference multiple resources
- Allows custom flags and extensions

**Syntax Examples**:

```http
If: (["etag-value"])           # Equivalent to If-Match: "etag-value"
If: (NOT ["etag-value"])       # Equivalent to If-None-Match: "etag-value"
If: </resource1> (["etag1"]) </resource2> (["etag2"])  # Multi-resource conditions
```

**Implementation Status**: ✅ Standards-based (RFC 4918)
**Server Support**: Varies by implementation

### 2. WebDAV LOCK/UNLOCK Mechanism

**Description**: Use WebDAV locking to reserve resource names before creation.

**Process**:

1. Send `LOCK` request to unmapped URL to reserve the name
2. If lock succeeds, resource doesn't exist - proceed with creation
3. Create resource with `PUT`
4. `UNLOCK` the resource

**Advantages**:

- Prevents race conditions
- Clear resource reservation semantics
- Supported by most WebDAV servers

**Disadvantages**:

- Requires multiple requests
- Lock timeout management complexity
- Not all servers support locking on unmapped URLs

**Implementation Status**: ✅ Standards-based (RFC 4918)
**Server Support**: Wide but not universal

### 3. Overwrite Header (Limited Scope)

**Description**: WebDAV `Overwrite: F` header prevents overwriting during COPY/MOVE operations.

**Usage**:

```http
COPY /source HTTP/1.1
Destination: /target
Overwrite: F
```

**Limitations**:

- ⚠️ **Only works with COPY/MOVE, not PUT**
- Cannot be used for direct resource creation
- Useful for safe resource relocation/duplication

**Implementation Status**: ✅ Standards-based (RFC 4918)
**Server Support**: Wide

### 4. HEAD-then-PUT Pattern

**Description**: Check resource existence before creation using HEAD request.

**Process**:

1. Send `HEAD` request to target URL
2. If 404 (not found), proceed with `PUT`
3. If 200 (exists), handle conflict appropriately

**Advantages**:

- Works with any HTTP server
- Simple implementation
- No conditional header dependencies

**Disadvantages**:

- ⚠️ **Race condition vulnerability** (resource could be created between HEAD and PUT)
- Two requests required
- Not atomic

**Implementation Status**: ✅ Standard HTTP
**Server Support**: Universal

### 5. Last-Modified-Based Approaches

**Description**: Use timestamp-based conditional headers for servers without ETag support.

**Limitations**:

- ❌ **Cannot prevent initial resource creation** (no timestamp for non-existent resources)
- `If-Modified-Since`/`If-Unmodified-Since` only work with GET/HEAD requests
- Only useful for updates, not creation

**Verdict**: Not viable for resource creation scenarios

### 6. Custom Application-Level Protocols

**Description**: Implement application-specific safety mechanisms.

**Examples**:

- Unique filename generation (UUIDs, timestamps)
- Application-level locks/reservations
- Database-backed existence checking
- Custom HTTP headers

**Advantages**:

- Complete control over behavior
- Can work around server limitations
- Application-specific optimization

**Disadvantages**:

- Non-standard approaches
- Increased complexity
- Limited interoperability

## Implementation Recommendations

### Priority Order

1. **First Choice**: `If-None-Match: *` (if server supports it properly)
2. **Fallback 1**: WebDAV `If` header with `NOT` operator
3. **Fallback 2**: WebDAV LOCK/UNLOCK mechanism
4. **Fallback 3**: HEAD-then-PUT with conflict handling
5. **Last Resort**: Application-specific approaches

### Detection Strategy

```typescript
// Pseudo-code for capability detection
async function detectSafeCreationCapabilities(server: WebDAVServer) {
  try {
    // Test If-None-Match: * support
    await server.testConditionalHeaders();
    return 'if-none-match';
  } catch (error) {
    if (error.status === 412) {
      // Server supports conditional headers but may have bugs
      return 'webdav-if-header';
    }
  }

  try {
    // Test WebDAV If header support
    await server.testWebDAVIfHeader();
    return 'webdav-if-header';
  } catch (error) {
    // Fall back to LOCK mechanism
    return 'lock-unlock';
  }
}
```

### Error Handling

Common error responses and handling strategies:

| Status Code | Meaning             | Handling Strategy                                             |
| ----------- | ------------------- | ------------------------------------------------------------- |
| 412         | Precondition Failed | Resource exists or conditional failed - expected for safety   |
| 423         | Locked              | Resource is locked - retry with backoff or fail               |
| 405         | Method Not Allowed  | Server doesn't support method - try alternative               |
| 501         | Not Implemented     | Server doesn't support feature - fallback to simpler approach |

## Known Server Limitations

### Nextcloud/Sabre DAV

- Issues with `If-None-Match: *` returning 412 errors
- Generally supports WebDAV `If` header
- Strong ETag support

### Lighttpd mod_webdav

- Known 412 Precondition Failed issues with conditional headers
- Limited WebDAV feature support
- Consider HEAD-then-PUT approach

### Microsoft IIS WebDAV

- Variable conditional header support depending on version
- Good LOCK/UNLOCK support
- Test thoroughly for specific IIS versions

### Apache mod_dav

- Generally good conditional header support
- Strong WebDAV compliance
- Reliable `If-None-Match: *` support

## Security Considerations

1. **Authorization First**: RFC 4918 requires authorization checks before conditional header evaluation
2. **Race Condition Awareness**: Multi-request approaches have inherent timing vulnerabilities
3. **Lock Timeout Management**: Proper cleanup of failed lock operations
4. **Error Information Disclosure**: Avoid exposing internal server state in error messages

## Conclusion

While `If-None-Match: *` remains the preferred standard approach, WebDAV implementations often require fallback strategies. The WebDAV `If` header provides the most powerful alternative, followed by the LOCK/UNLOCK mechanism for broader compatibility. HEAD-then-PUT should be used cautiously due to race condition risks, and Last-Modified-based approaches cannot solve the resource creation safety problem.

The key is implementing a robust capability detection and fallback system that gracefully handles various server implementations and their limitations.
