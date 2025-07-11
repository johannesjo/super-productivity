# Mobile Logging Strategy for Super Productivity

## Current State Analysis

### Existing Logging Infrastructure

- **Console Logging**: Uses `pfLog` system with configurable levels (level 2 in production)
- **Native Bridge Logging**: Capacitor enables Android Log class usage for native logging
- **Global Error Handler**: Captures unhandled errors and can generate GitHub issues
- **Development Logging**: Console logs visible via `adb logcat` (Android) and Xcode console (iOS)

### Current Limitations

- **No log persistence** on mobile devices for production releases
- **No log export mechanism** for end users or support
- **No crash reporting service** for remote log collection
- **Limited debugging capabilities** for production mobile releases
- **No structured logging** with device metadata

## Problem Statement

When users experience issues with mobile releases, there's currently no way to:

1. Access application logs from production builds
2. Export logs for support or debugging
3. Collect crash information automatically
4. Debug issues that only occur on specific devices/OS versions

## Recommended Solutions

### Phase 1: Local Log Collection & Export (High Priority)

#### 1.1 Mobile Log Collection Service

```typescript
// New service: MobileLogService
- Intercept and store console.log, console.error, console.warn
- Add device metadata (OS version, app version, device model)
- Implement circular buffer with size limits (e.g., 1000 entries, 5MB max)
- Include timestamps and log levels
- Store in device's persistent storage (Capacitor Preferences or Filesystem)
```

#### 1.2 Log Export Feature

```typescript
// Settings menu addition
- "Export Logs" button in Debug/Support section
- Generate ZIP file with:
  - Filtered logs (remove sensitive data)
  - Device info summary
  - App configuration (non-sensitive)
- Use Capacitor Share plugin for native sharing
- Allow email export or cloud storage upload
```

#### 1.3 Privacy-Aware Filtering

```typescript
// Log sanitization
- Remove or hash potential PII (task names, project names)
- Filter out authentication tokens
- Exclude sync data content
- Maintain error stack traces and system info
```

### Phase 2: Enhanced Error Reporting (Medium Priority)

#### 2.1 Mobile-Specific Error Handler

```typescript
// Extend existing GlobalErrorHandler
- Detect mobile-specific errors (Capacitor plugin failures)
- Include device capabilities and plugin versions
- Store critical errors separately for priority export
- Add network connectivity status to error context
```

#### 2.2 Crash Recovery Information

```typescript
// On app restart after crash
- Detect unclean shutdown
- Prompt user to export crash logs
- Include memory usage and app state before crash
```

### Phase 3: Development & Debug Improvements (Medium Priority)

#### 3.1 In-App Log Viewer

```typescript
// Debug-only component
- Scrollable log view with filtering
- Real-time log streaming
- Export selected logs
- Available only in development/debug builds
```

#### 3.2 Remote Development Logging

```typescript
// Development environment only
- WebSocket log streaming to development server
- Real-time debugging on actual devices
- Network request/response logging for mobile-specific issues
```

### Phase 4: Optional Remote Logging (Low Priority)

#### 4.1 Crash Reporting Service Integration

```typescript
// Optional third-party integration
- Sentry, Bugsnag, or similar service
- User consent required (privacy-first approach)
- Configurable in settings (off by default)
- Minimal data collection (errors only, no analytics)
```

## Implementation Details

### Technical Approach

#### Log Storage Architecture

```
Mobile Device Storage:
├── logs/
│   ├── app-logs.json          # Application logs
│   ├── error-logs.json        # Critical errors
│   └── device-info.json       # Static device metadata
```

#### Log Entry Structure

```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source?: string; // Component/service name
  metadata?: {
    deviceInfo?: DeviceInfo;
    appVersion: string;
    buildType: 'dev' | 'prod';
    stackTrace?: string; // For errors
  };
}
```

### Dependencies Required

- `@capacitor/share` - For log export sharing
- `@capacitor/filesystem` - For log file management
- `@capacitor/device` - For device information collection

### Privacy Considerations

- **Local-first approach**: Logs stored locally, exported manually
- **User consent**: Clear disclosure of what data is collected
- **Data minimization**: Only collect essential debugging information
- **Sanitization**: Remove or hash potentially sensitive content
- **User control**: Easy log deletion and export management

## Testing Strategy

### Unit Tests

- Log collection service functionality
- Privacy filtering effectiveness
- Log rotation and size management

### Integration Tests

- Mobile platform log export flow
- Error capture and storage
- Share functionality across different apps

### Manual Testing Scenarios

- Log export on various devices/OS versions
- Large log file handling
- App crash recovery and log preservation
- Share dialog integration with email/cloud apps

## Rollout Plan

### Phase 1 (Immediate)

1. Implement MobileLogService
2. Add basic log export in settings
3. Test on development builds

### Phase 2 (Next Release)

1. Enhanced error reporting
2. Privacy filtering refinements
3. User documentation

### Phase 3 (Future)

1. In-app log viewer for debug builds
2. Remote development logging
3. Optional crash reporting integration

## Success Metrics

- **User Support**: Reduced time to diagnose mobile-specific issues
- **Bug Resolution**: Faster identification of device-specific problems
- **Privacy Compliance**: Zero privacy violations related to logging
- **Performance**: No significant impact on app performance or storage

## Alternative Approaches Considered

### Remote-First Logging

**Rejected**: Conflicts with privacy-first philosophy and requires server infrastructure

### Always-On Crash Reporting

**Rejected**: Privacy concerns and user consent complexity

### File-Based Log Export

**Considered**: Less user-friendly than native share integration

## Future Considerations

- Integration with existing GitHub issue creation workflow
- Automated log collection triggers (e.g., repeated crashes)
- Integration with upcoming sync diagnostics
- Cross-platform log format standardization

---

**Document Created**: 2025-07-07  
**Author**: Claude (AI Assistant)  
**Status**: Planning Phase  
**Next Review**: After Phase 1 implementation
