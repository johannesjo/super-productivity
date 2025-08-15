# WebDAV Code Issues Found

## Issues in webdav-http-adapter.ts

1. **Invalid Response status in error handling** (Lines 77-78, 121-122)
   - Creating Response objects with status 0 is invalid (must be 200-599)
   - Should use a valid error status like 500 for network errors

# WebDAV Code Issues Found

## Issues in webdav-api.ts

1. **Unused parameter `useGetFallback`** (Line 27)

   - The parameter is defined but never used in the method
   - The HEAD fallback code is commented out (lines 57-59)
   - This parameter was intended to enable fallback to HEAD request when PROPFIND fails

2. **Unused method `_getFileMetaViaHead`** (Line 346)

   - Private method that implements HEAD request fallback
   - Not currently being used because the fallback logic is commented out
   - Should either be removed or the fallback logic should be implemented

3. **Exception caught locally warnings** (Lines 61, 180, 206)
   - These are eslint warnings about throwing exceptions within try-catch blocks
   - This is intentional error handling pattern and can be ignored

## Issues in webdav.ts

1. **Inconsistent revision handling in `getFileRev`**
   - After reverting changes, the method now only returns `meta.etag`
   - Should handle cases where etag might be missing and fall back to `meta.lastmod`

## Recommendations

1. Either implement the HEAD fallback functionality or remove the unused parameter and method
2. Add proper error handling for missing etag values
3. Consider adding more comprehensive logging for debugging sync issues
