# SuperSync - Custom Sync Server Plan

## Overview

SuperSync is a custom sync server solution built on top of WebDAV, designed to provide enhanced synchronization capabilities for Super Productivity. While using WebDAV as the underlying protocol, SuperSync adds custom features that address limitations of standard WebDAV sync.

## Feature Phases

### 1. Super Basic Sync

Working webdav clone implemented and works both on server and client side with multi file sync just as webdav would.

### 2. Safer Sync with Sync Completion Detection

Server is now able to detect when a sync operation is complete and only then commits the changes. This prevents partial uploads/downloads from corrupting data.

### 3. Automatic Backups

The server automatically creates backups of complete datasets before they are overwritten or deleted, allowing clients to restore previous versions if needed. There should be only 3 backup slots (last conflict, last valid yesterday, last valid last week) to keep data usage minimal.

### 4. Improve UX

- Login and register experience is improved and simplified
-

### 5. Incremental Updates

– needs concept –
