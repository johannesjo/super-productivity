# SuperSync - Custom Sync Server Plan

## Overview

SuperSync is a custom sync server solution built on top of WebDAV, designed to provide enhanced synchronization capabilities for Super Productivity. While using WebDAV as the underlying protocol, SuperSync adds custom features that address limitations of standard WebDAV sync.

## Feature Phases

### 1. Super Basic Sync ✓

Working WebDAV clone implemented and works both on server and client side with multi-file sync just as WebDAV would.

### 2. Safer Sync with Sync Completion Detection

Server detects incomplete syncs using the **existing meta file lock mechanism** (no extra requests needed).

**How it works (already implemented in client):**

1. Client writes meta file with `META_FILE_LOCK_CONTENT_PREFIX` before uploading
2. Client uploads all data files
3. Client writes final meta file (without prefix) to signal completion

**Server-side enhancement:**

- When meta file contains lock prefix → mark sync as "in progress"
- Stage uploaded files in temp location while lock is active
- When final meta file arrives (no prefix, valid JSON) → atomically move staged files to final location
- If lock remains for > timeout (e.g., 5 min) → discard staged files

**Zero extra requests** - reuses existing client behavior.

### 3. Automatic Backups

The server automatically creates backups of complete datasets before they are overwritten or deleted, allowing clients to restore previous versions if needed.

**Backup slots (3 total):**

- Last valid sync before current
- Last valid state before conflicting sync
- Last valid state from yesterday
- Last valid from last week

### 4. Improve UX

- Login and register experience is improved and simplified
- Better error messages and sync status feedback
- Connection testing before sync

### 5. Incremental File Updates

- instead of uploading entire files we try to derive deltas and upload those
  _– needs concept –_
