# Share Component

Multi-platform share functionality for Super Productivity.

## Overview

This module provides a reusable share system that works across all platforms:

- **Desktop (Electron)**: Opens share URLs in browser via shell
- **Mobile (Android)**: Uses Capacitor Share plugin when available
- **Web (PWA)**: Uses Web Share API when available
- **Fallback**: Material dialog with intent URLs for all social platforms

## Quick Start

### Basic Usage

```typescript
import { ShareService } from './core/share/share.service';
import { ShareFormatter } from './core/share/share-formatter';

// In your component
constructor(private shareService: ShareService) {}

async shareWorkSummary() {
  const payload = ShareFormatter.formatWorkSummary({
    totalTimeSpent: 3600000, // 1 hour in ms
    tasksCompleted: 5,
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-07',
    },
  }, {
    includeUTM: true,
    includeHashtags: true,
  });

  await this.shareService.share(payload);
}
```

### Using the Share Button Component

```html
<share-button
  [payload]="mySharePayload"
  tooltip="Share your achievements"
/>
```

```typescript
// In component
import { ShareButtonComponent } from './core/share/share-button/share-button.component';
import { ShareFormatter } from './core/share/share-formatter';

@Component({
  imports: [ShareButtonComponent],
  // ...
})
export class MyComponent {
  readonly sharePayload = ShareFormatter.formatWorkSummary({
    totalTimeSpent: this.totalTime,
    tasksCompleted: this.completedTaskCount,
  });
}
```

## API Reference

### ShareService

Main service for sharing content.

#### Methods

- `share(payload: SharePayload, target?: ShareTarget): Promise<ShareResult>`

  - Main share method that automatically detects platform and uses best method
  - If target is specified, shares directly to that target
  - Otherwise, tries native share first, then shows dialog

- `getShareTargets(): ShareTargetConfig[]`
  - Returns list of available share targets with their configurations

### ShareFormatter

Utility class for formatting content into shareable payloads.

#### Methods

- `formatWorkSummary(data: WorkSummaryData, options?: ShareFormatterOptions): SharePayload`

  - Formats work statistics as shareable text with time spent, tasks completed, etc.

- `formatPromotion(customText?: string, options?: ShareFormatterOptions): SharePayload`

  - Creates a promotional share payload for the app

- `optimizeForTwitter(payload: SharePayload): SharePayload`
  - Truncates text to fit Twitter's character limit

### SharePayload Interface

```typescript
interface SharePayload {
  text?: string; // Main text content
  url?: string; // URL to share
  title?: string; // Optional title (used by Reddit, Email)
  files?: string[]; // Optional file paths for native share (future use)
}
```

### ShareTarget Type

Supported share targets:

- `twitter` - Twitter/X
- `linkedin` - LinkedIn
- `reddit` - Reddit
- `facebook` - Facebook
- `whatsapp` - WhatsApp
- `telegram` - Telegram
- `email` - Email
- `mastodon` - Mastodon (with custom instance support)
- `clipboard-text` - Copy formatted text to clipboard
- `native` - Use native OS share sheet

## Platform Support

### Desktop (Electron)

- Uses `shell.openExternal()` to open share URLs
- Native share handler stubbed out (ready for macOS/Windows native implementation)
- IPC event: `SHARE_NATIVE`

### Mobile (Android via Capacitor)

- Checks for Capacitor Share plugin at runtime via `window.Capacitor?.Plugins?.Share`
- No build-time dependency required
- Falls back gracefully if plugin not installed

### Web (PWA/Browser)

- Uses Web Share API when available
- Falls back to share dialog with intent URLs

## Architecture

### Files Structure

```
src/app/core/share/
├── share.model.ts                 # TypeScript interfaces
├── share-formatter.ts             # Work summary formatter
├── share-formatter.spec.ts        # Formatter tests
├── share.service.ts               # Main share service
├── share.service.spec.ts          # Service tests
├── dialog-share/                  # Material dialog component
│   ├── dialog-share.component.ts
│   ├── dialog-share.component.html
│   └── dialog-share.component.scss
└── share-button/                  # Reusable button component
    └── share-button.component.ts
```

### Electron Integration

```
electron/
├── shared-with-frontend/
│   └── ipc-events.const.ts       # Added SHARE_NATIVE event
├── electronAPI.d.ts              # Added shareNative method
├── preload.ts                    # Exposed shareNative to renderer
└── ipc-handler.ts                # IPC handler (fallback stub)
```

## Future Enhancements

### Native OS Share Implementation

The Electron IPC handler currently returns a fallback error. To implement true native share:

#### macOS

Create a Swift/Objective-C bridge using `NSSharingServicePicker`:

```swift
import Cocoa

@objc class ShareHelper: NSObject {
    @objc static func share(text: String, url: String, files: [String]) {
        let items = [text, URL(string: url)!] + files.map { URL(fileURLWithPath: $0) }
        let picker = NSSharingServicePicker(items: items)
        // Show picker at mouse location
    }
}
```

#### Windows

Create a C#/C++ bridge using WinRT `DataTransferManager`:

```csharp
using Windows.ApplicationModel.DataTransfer;

var dataTransferManager = DataTransferManager.GetForCurrentView();
dataTransferManager.DataRequested += (sender, args) => {
    args.Request.Data.SetText(text);
    args.Request.Data.SetWebLink(new Uri(url));
};
DataTransferManager.ShowShareUI();
```

### Capacitor Plugin Installation

To enable native Android sharing, install the Capacitor Share plugin:

```bash
npm install @capacitor/share
```

The service will automatically detect and use it when available.

## Testing

Unit tests are included for:

- `share-formatter.spec.ts` - Tests formatting logic
- `share.service.spec.ts` - Tests service methods and URL building

Run tests:

```bash
npm test
```

## Contributing

When adding new share targets:

1. Add target to `ShareTarget` type in `share.model.ts`
2. Add URL builder to `_buildShareUrl()` in `share.service.ts`
3. Add button config to `shareTargets` array in `dialog-share.component.ts`
4. Add tests in `share.service.spec.ts`

## License

Part of Super Productivity - see main project LICENSE.
