# WebDAV Conditional Headers Guide

## Overview

Conditional headers in HTTP/WebDAV provide a mechanism to make requests conditional based on the current state of a resource. However, they don't guarantee proper error handling in all cases.

## Headers Used in Our Implementation

### For Downloads (GET)

- **If-None-Match**: Sent with ETag values
- **If-Modified-Since**: Sent with date values

### For Uploads (PUT)

- **If-Match**: Sent with ETag values
- **If-Unmodified-Since**: Sent with date values

## Expected Server Responses

### Successful Conditions

- **GET with matching conditions**: Returns 304 Not Modified
- **PUT with matching conditions**: Returns 200/201/204 (success)

### Failed Conditions

- **GET with non-matching conditions**: Returns 200 with full content
- **PUT with non-matching conditions**: Returns 412 Precondition Failed

## Limitations and Edge Cases

### 1. Server Implementation Variations

Not all WebDAV servers implement conditional headers consistently:

- Some servers ignore date-based headers entirely
- Some only support ETags, not Last-Modified dates
- Some servers don't return proper error codes

### 2. Date Format Issues

The implementation now validates and normalizes dates:

```typescript
// Invalid date strings are caught and handled
const parsedDate = new Date(localRev);
if (isNaN(parsedDate.getTime())) {
  // Falls back to ETag handling
}
```

### 3. Missing Error Guarantees

IF headers don't guarantee errors when:

- Server doesn't support conditional requests
- Server implementation is non-compliant
- Network proxies strip conditional headers
- Server has different precision for timestamps

## Best Practices

### 1. Always Validate Dates

```typescript
// Good - validates before use
const date = new Date(parseInt(localRev));
if (!isNaN(date.getTime())) {
  headers['If-Modified-Since'] = date.toUTCString();
}
```

### 2. Handle Missing 412 Responses

Some servers might accept uploads even with failed preconditions:

```typescript
// After upload, verify the returned ETag matches expectations
if (response.headers['etag'] !== expectedEtag) {
  // Handle potential conflict
}
```

### 3. Use ETags When Available

ETags are more reliable than date-based conditions:

- More precise (exact match)
- Less prone to timezone/format issues
- Better server support

### 4. Implement Fallback Strategies

```typescript
// If no 304 received when expected, compare content
if (response.status === 200 && localRev) {
  // Compare returned rev with localRev
  if (response.headers['etag'] === localRev) {
    // Content unchanged despite 200 response
  }
}
```

## Security Considerations

### 1. Race Conditions

Even with conditional headers, race conditions can occur:

- Between check and upload
- Between multiple clients
- Solution: Use vector clocks or conflict resolution

### 2. Weak vs Strong ETags

Some servers use weak ETags (W/"..."):

- May not prevent all conflicts
- Consider treating as hints only

### 3. Cache Poisoning

Malicious servers could:

- Return incorrect 304 responses
- Provide false ETags
- Solution: Verify content integrity separately

## Recommendations

1. **Don't rely solely on conditional headers** for conflict detection
2. **Implement client-side validation** of responses
3. **Use vector clocks** for distributed synchronization
4. **Log all conditional header usage** for debugging
5. **Test with multiple WebDAV servers** to ensure compatibility

## Testing Conditional Headers

### Test Scenarios

1. Valid ETag → 304/412 response
2. Invalid ETag → 200/201 response
3. Valid date → 304/412 response
4. Invalid date → Fallback behavior
5. Missing server support → Normal response

### Example Test

```typescript
it('should handle servers ignoring conditional headers', async () => {
  // Server returns 200 despite If-None-Match
  const response = { status: 200, headers: { etag: 'same-etag' } };

  // Implementation should detect unchanged content
  expect(result.unchanged).toBe(true);
});
```

## Conclusion

While IF headers provide a standardized way to implement conditional requests, they don't guarantee proper error responses from all servers. The implementation must:

- Validate all inputs
- Handle non-compliant servers
- Implement fallback strategies
- Not rely solely on conditional headers for conflict detection
